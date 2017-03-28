// Description:
//   Display OpenWinesDatabase open PRs
//
// Dependencies:
//   None
//
// Configuration:
//   None
//
// Commands:
//   hubot show me open prs - Display the list of open prs
//

const fetch = require('isomorphic-fetch');
const moment = require('moment');
const TIMEOUT = 4 * 60 * 60000;
const token = process.env.GITHUB_TOKEN || '--';

module.exports = (robot) => {

  function notifyForOpenPRs() {
    return fetchAllRepos()
      .then(items => Promise.all(items.map(fetchOpenPrs)))
      .then(arrOfArr => [].concat.apply([], arrOfArr))
      .then(arr => [arr.length, arr.map(format).join('\n')])
      .then(tuple => {
        const [size, response] = tuple;
        if (size > 0) {
          robot.messageRoom('dev-notifications', "\nje vous rappelle qu'il y a actuellement `" + size + "` pull requests ouvertes sur les projets OpenWinesDatabase. Voici la liste :\n\n" + response + "\n");
        }
        setTimeout(notifyForOpenPRs, TIMEOUT);
      });
  }

  setTimeout(notifyForOpenPRs, 5000);

  function fetchAllRepos() {
    return fetch('https://api.github.com/orgs/OpenWinesDatabase/repos', {
      headers: {
        'Authorization': 'token ' + token
      }
    }).then(r => r.json(), e => console.error(e)).then(arr => {
      return arr
        .filter(p => moment(p.pushed_at).isAfter(moment().subtract(2, 'month')))
        .map(project => project.full_name);
    });
  }

  function fetchOpenPrs(repoName) {
    return fetch(`https://api.github.com/repos/${repoName}/pulls`, {
      headers: {
        'Authorization': 'token ' + token
      }
    }).then(r => r.json(), e => console.error(e)).then(arr => {
      return arr.filter(pr => pr.state === 'open').map(pr => {
        return {
          number: pr.number,
          project: repoName,
          title: pr.title,
          user: pr.user.login,
          link: pr.html_url,
          date: moment(pr.created_at).format('DD/MM/YYYY')
        };
      });
    });
  }

  function format(pr) {
    return ` * \`PR#${pr.number}\` sur le projet \`${pr.project}\` ouverte le \`${pr.date}\` par \`${pr.user}\` : ${pr.title} => ${pr.link}`;
  }

  robot.respond(/show me open prs/i, (hubotRes) => {
    return fetchAllRepos()
      .then(items => Promise.all(items.map(fetchOpenPrs)))
      .then(arrOfArr => [].concat.apply([], arrOfArr))
      .then(arr => [arr.length, arr.map(format).join('\n')])
      .then(tuple => {
        const [size, response] = tuple;
        if (size <= 0) {
          hubotRes.reply("\nIl n'y a actuellement aucune pull request ouverte sur les projets OpenWinesDatabase ... :metal:\n");
        } else {
          hubotRes.reply("\nIl y a actuellement `" + size + "` pull requests ouvertes sur les projets OpenWinesDatabase. Voici la liste :\n\n" + response + "\n");
        }
      });
  });
};
