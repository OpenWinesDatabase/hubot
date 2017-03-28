// Description:
//   An HTTP Listener that notifies about new Github pull requests
//
// Dependencies:
//   "url": ""
//   "querystring": ""
//

const urllib = require('url');
const querystring = require('querystring');

const TIME_IN_QUEUE_LABEL = "15 prochaines minutes";
const TIME_IN_QUEUE = 15 * 60000;
const token = process.env.GITHUB_TOKEN || '--';

Array.prototype.__unique = () => {
  let i,
    ref;
  const output = {};
  for (const key = i = 0, ref = this.length; 0 <= ref
    ? i < ref
    : i > ref; key = 0 <= ref
    ? ++i
    : --i) {
    output[this[key]] = this[key];
  }
  const results = [];
  for (const key in output) {
    const value = output[key];
    results.push(value);
  }
  return results;
};

module.exports = (robot) => {
  const waitingApprovedPR = {};
  const displayApprovedPullRequests = () => {
    if (Object.keys(waitingApprovedPR).length > 0) {
      const values = Object.keys(waitingApprovedPR).map((k) => waitingApprovedPR[k]);
      const rooms = [...values.map((v) => v.rooms).__unique()];
      const message = "\nCes pull requests approuvées sont en attente de merge\n\n" + values.map((v) => "* " + v.title + ", plus que `" + (Math.abs(((Date.now() - v.timeout) / 1000).toFixed(0))) + " secondes` restantes").join('\n') + "\n";
      rooms.forEach((room) => robot.messageRoom(room, message));
    }
    return setTimeout(displayApprovedPullRequests, TIME_IN_QUEUE);
  };
  displayApprovedPullRequests();
  const uniqueId = (length) => {
    if (length == null) {
      length = 8;
    }
    let id = "";
    while (id.length < length) {
      id += Math.random().toString(36).substr(2);
    }
    return id.substr(0, length);
  };
  const deleteBranch = (robot, project, branch) => robot.http("https://api.github.com/repos/" + project + "/git/refs/heads/" + branch).header('Authorization', 'token ' + token)["delete"]()((err, res, raw) => console.log(raw));

  const maybeMergePR = (id, robot, hubotRes) => {
    if (waitingApprovedPR[id]) {
      const prNumber = waitingApprovedPR[id].prNumber;
      const project = waitingApprovedPR[id].project;
      const branch = waitingApprovedPR[id].branch;
      delete waitingApprovedPR[id];
      return robot.http("https://api.github.com/repos/" + project + "/pulls/" + prNumber + "/merge").header('Authorization', 'token ' + token).put({})((err, res, raw) => {
        const body = JSON.parse(raw);
        if (body.merged) {
          deleteBranch(robot, project, branch);
          return hubotRes.reply("La pull request `" + prNumber + "` a été mergée avec succès");
        } else {
          return hubotRes.reply("La pull request `" + prNumber + "` n'a pas pu être mergée, vous devez le faire manuellement depuis https://github.com/" + project + "/pull/" + prNumber);
        }
      });
    } else if (id.indexOf('#') > -1) {
      const prNumber = id.split('#')[1];
      const project = "OpenWinesDatabase/" + id.split('#')[0];
      return robot.http("https://api.github.com/repos/" + project + "/pulls/" + prNumber).header('Authorization', 'token ' + token).get()((e, r, ra) => {
        const data1 = JSON.parse(ra);
        const branch = data1.head.ref;
        return robot.http("https://api.github.com/repos/" + project + "/pulls/" + prNumber + "/merge").header('Authorization', 'token ' + token).put({})((err, res, raw) => {
          const body = JSON.parse(raw);
          if (body.merged) {
            deleteBranch(robot, project, branch);
            return hubotRes.reply("La pull request `" + prNumber + "` a été mergée avec succès");
          } else {
            return hubotRes.reply("La pull request `" + prNumber + "` n'a pas pu être mergée, vous devez le faire manuellement depuis https://github.com/" + project + "/pull/" + prNumber);
          }
        });
      });
    } else {
      return hubotRes.reply("Je n'ai aucune pull request approuvée en attente avec l'id `" + id + "`");
    }
  };
  const registerApprovedPR = (prNumber, project, branch, rooms, link, title) => {
    const id = uniqueId(6);
    waitingApprovedPR[id] = {
      prNumber: prNumber,
      project: project,
      branch: branch,
      title: title,
      timeout: Date.now() + TIME_IN_QUEUE,
      rooms: rooms,
      link: link
    };
    setTimeout(() => {
      console.log("remove approved PR " + id);
      const pr = waitingApprovedPR[id];
      rooms.forEach((room) => robot.messageRoom(room, "Je ne suis plus capable de merger la pull request `" + pr.prNumber + "` du project `" + pr.project + "`.\nVous devrez dorénavant la merger manuellement à l'adresse " + pr.link));
      return delete waitingApprovedPR[id];
    }, TIME_IN_QUEUE);
    return id;
  };
  const announceIssueEvent = (data, rooms, cb) => {
    const project = data.repository.full_name;
    if (data.action === "assigned") {
      const message = "L'issue `" + data.issue.number + "` du projet `" + project + "` vient d'être assignée à `" + data.assignee.login + "` par `" + data.sender.login + "`\n* URL de l'issue : " + data.issue.html_url + "\n* Titre de l'issue : " + data.issue.title;
      cb(message);
    }
    if (data.action === "unassigned") {
      const message = "L'issue `" + data.issue.number + "` du projet `" + project + "` vient d'être désassignée de `" + data.assignee.login + "` par `" + data.sender.login + "`\n* URL de l'issue : " + data.issue.html_url + "\n* Titre de l'issue : " + data.issue.title;
      cb(message);
    }
    if (data.action === "labeled") {
      const message = "Le label `" + data.label.name + "` vient d'être ajouté à l'issue `" + data.issue.number + "` du projet `" + project + "` par `" + data.sender.login + "`\n* URL de l'issue : " + data.issue.html_url + "\n* Titre de l'issue : " + data.issue.title;
      cb(message);
    }
    if (data.action === "unlabeled") {
      const message = "Le label `" + data.label.name + "` vient d'être enlevé de l'issue `" + data.issue.number + "` du projet `" + project + "` par `" + data.sender.login + "`\n* URL de l'issue : " + data.issue.html_url + "\n* Titre de l'issue : " + data.issue.title;
      cb(message);
    }
    if (data.action === "milestoned") {
      const message = "La milestone `" + data.issue.milestone.title + "` vient d'être ajouté à l'issue `" + data.issue.number + "` du projet `" + project + "` par `" + data.sender.login + "`\n* URL de l'issue : " + data.issue.html_url + "\n* Titre de l'issue : " + data.issue.title;
      cb(message);
    }
    if (data.action === "demilestoned") {
      const message = "Une milestone vient d'être retirée de l'issue `" + data.issue.number + "` du projet `" + project + "` par `" + data.sender.login + "`\n* URL de l'issue : " + data.issue.html_url + "\n* Titre de l'issue : " + data.issue.title;
      cb(message);
    }
    if (data.action === "opened") {
      const message = "L'issue `" + data.issue.number + "` du projet `" + project + "` vient d'être créée par `" + data.issue.user.login + "`\n* URL de l'issue : " + data.issue.html_url + "\n* Titre de l'issue : " + data.issue.title;
      cb(message);
    }
    if (data.action === "edited") {
      const message = "L'issue `" + data.issue.number + "` du projet `" + project + "` vient d'être mise à jour par `" + data.sender.login + "`\n* URL de l'issue : " + data.issue.html_url + "\n* Titre de l'issue : " + data.issue.title;
      cb(message);
    }
    if (data.action === "closed") {
      const message = "L'issue `" + data.issue.number + "` du projet `" + project + "` vient d'être fermée par `" + data.sender.login + "`\n* URL de l'issue : " + data.issue.html_url + "\n* Titre de l'issue : " + data.issue.title;
      cb(message);
    }
    if (data.action === "reopened") {
      const message = "L'issue `" + data.issue.number + "` du projet `" + project + "` vient d'être ré-ouverte par `" + data.sender.login + "`\n* URL de l'issue : " + data.issue.html_url + "\n* Titre de l'issue : " + data.issue.title;
      return cb(message);
    }
  };
  const announceIssueCommentEvent = (data, rooms, cb) => {
    const project = data.repository.full_name;
    if (data.action === "created") {
      const message = "`" + data.comment.user.login + "` vient d'ajouter un commentaire sur l'issue `" + data.issue.number + "` du projet `" + project + "`\n* URL de l'issue : " + data.issue.html_url + "\n* Titre de l'issue : " + data.issue.title;
      cb(message);
    }
    if (data.action === "edited") {
      const message = "`" + data.comment.user.login + "` vient de modifier un commentaire sur l'issue `" + data.issue.number + "` du projet `" + project + "`\n* URL de l'issue : " + data.issue.html_url + "\n* Titre de l'issue : " + data.issue.title;
      cb(message);
    }
    if (data.action === "deleted") {
      const message = "`" + data.comment.user.login + "` vient d'effacer un commentaire sur l'issue `" + data.issue.number + "` du projet `" + project + "`\n* URL de l'issue : " + data.issue.html_url + "\n* Titre de l'issue : " + data.issue.title;
      return cb(message);
    }
  };
  const announcePullRequestReviewEvent = (data, rooms, cb) => {
    const project = data.pull_request.head.repo.full_name;
    if (data.review.state === 'commented') {
      const message = "La pull request `" + data.pull_request.number + "` a été commentée par `" + data.review.user.login + "` sur le projet `" + project + "`\n* URL de la PR : " + data.pull_request.html_url + "\n* Titre de la PR : \"" + data.pull_request.title + "\"";
      cb(message);
    }
    if (data.review.state === 'changes_requested') {
      const message = "L'utilisateur `" + data.review.user.login + "` à requis des changements sur la pull request `" + data.pull_request.number + "` du projet `" + project + "`\n* URL de la PR : " + data.pull_request.html_url + "\n* Titre de la PR : \"" + data.pull_request.title + "\"";
      cb(message);
    }
    if (data.review.state === 'approved') {
      const id = registerApprovedPR(data.pull_request.number, project, data.pull_request.head.ref, rooms, data.pull_request.html_url, "`" + data.pull_request.number + "` sur `" + project + "` : " + data.pull_request.title);
      let message = "Pull request `" + data.pull_request.number + "` approuvée par `" + data.review.user.login + "` sur le projet `" + project + "`\n* URL de la PR : " + data.pull_request.html_url + "\n* Titre de la PR : \"" + data.pull_request.title + "\"";
      message = message + ("\n\nVous pouvez me demander de merger cette pull request durant les *" + TIME_IN_QUEUE_LABEL + "* avec l'id `" + id + "` (hubot merge me " + id + ")");
      return cb(message);
    }
  };
  const announcePullRequestEvent = (data, rooms, cb) => {
    let mentioned_line,
      ref;
    if (data.action === 'opened' || data.action === 'reopened') {
      const action = data.action === 'opened'
        ? "Nouvelle pull request"
        : "Ré-ouverture de la pull request";
      let mentioned = (ref = data.pull_request.body) != null
        ? ref.match(/(^|\s)(@[\w\-\/]+)/g)
        : void 0;
      if (mentioned) {
        mentioned = mentioned.filter((nick) => {
          const slashes = nick.match(/\//g);
          return slashes === null || slashes.length < 2;
        });
        mentioned = mentioned.map((nick) => nick.trim());
        mentioned = mentioned.__unique();
        mentioned_line = "\nMentionné: " + (mentioned.join(", "));
      } else {
        mentioned_line = '';
      }
      const project = data.pull_request.head.repo.full_name;
      const message = action + " `" + data.pull_request.number + "` soumise par `" + data.pull_request.user.login + "` sur le projet `" + project + "`\n* URL de la PR : " + data.pull_request.html_url + mentioned_line + "\n* Titre de la PR : \"" + data.pull_request.title + "\"\n* Description de la PR : " + data.pull_request.body;
      cb(message);
    }
    if (data.action === 'closed') {
      const project = data.pull_request.head.repo.full_name;
      const merged = data.pull_request.merged
        ? "mergée"
        : "fermée";
      const message = "Pull request `" + data.pull_request.number + "` " + merged + " par `" + data.pull_request.user.login + "` sur le projet `" + project + "`\n* URL de la PR : " + data.pull_request.html_url + "\n* Titre de la PR : \"" + data.pull_request.title + "\"";
      cb(message);
    }
    if (data.action === 'synchronize') {
      const project = data.pull_request.head.repo.full_name;
      const message = "Pull request `" + data.pull_request.number + "` mise à jour par `" + data.pull_request.user.login + "` sur le projet `" + project + "`\n* URL de la PR : " + data.pull_request.html_url + "\n* Titre de la PR : \"" + data.pull_request.title + "\"";
      return cb(message);
    }
  };
  robot.respond(/merge me (.*)/i, (hubotRes) => {
    const id = hubotRes.match[1];
    return maybeMergePR(id, robot, hubotRes);
  });
  return robot.router.post("/hubot/gh-pull-requests", (req, res) => {
    const query = querystring.parse(urllib.parse(req.url).query);
    const data = req.body;
    const rooms = query.room
      ? [query.room]
      : query.rooms.split(',');
    let processRequest = announcePullRequestEvent;
    if (data.review) {
      console.log("Pull request review event");
      processRequest = announcePullRequestReviewEvent;
    } else if (data.issue && !data.comment) {
      console.log("Issue event");
      processRequest = announceIssueEvent;
    } else if (data.issue && data.comment) {
      console.log("Issue Comment event");
      processRequest = announceIssueCommentEvent;
    } else {
      console.log("Pull request event");
      processRequest = announcePullRequestEvent;
    }
    try {
      processRequest(data, rooms, (what) => rooms.forEach((room) => robot.messageRoom(room, what)));
    } catch (_error) {
      error = _error;
      robot.messageRoom("hubot-testing", "Une erreur est surevenue : " + error + "\n\n```\n" + (JSON.stringify(data, null, 2)) + "\n```");
      rooms.forEach((room) => {
        return robot.messageRoom(room, "Whoa, j'ai eu une erreur: " + error);
      });
      console.log("github pull request notifier error: " + error + ". Request: " + req.body);
    }
    return res.end("");
  });
};
