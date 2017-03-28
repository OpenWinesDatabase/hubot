const urllib = require('url');
const querystring = require('querystring');

const cache = {};

module.exports = (robot) => {
  return robot.router.post("/hubot/clever-events", (req, res) => {
    const query = querystring.parse(urllib.parse(req.url).query);
    const data = req.body;
    const rooms = query.room ? [query.room] : query.rooms.split(',');
    console.log(`Received clever hook on rooms ${rooms} with body ${JSON.stringify(data, null, 2)}`)
    // rooms.forEach((room) => {
    //   return robot.messageRoom(room, '```' + JSON.stringify(data, null, 2) + '```');
    // });
    if (data.event === 'APPLICATION_REDEPLOY') {
      const name = cache[data.data.appId] ? ('`' + cache[data.data.appId] + '`') : ':ghost:';
      rooms.forEach((room) => {
        return robot.messageRoom(room, `L'application ${name} est en cours de redéploiement ...`);
      });
    }
    if (data.event === 'DEPLOYMENT_FAIL') {
      cache[data.data.id] = data.data.name;
      const author = data.data.authorName ? ('`' + data.data.authorName + '`') : ':ghost:'
      rooms.forEach((room) => {
        return robot.messageRoom(room, `Le déploiement de l'application \`${data.data.name}\` n'a pas fonctionné :disappointed:, il faudrait peut-être regarder ce qui ne va pas ${author}`);
      });
    }
    if (data.event === 'DEPLOYMENT_SUCCESS') {
      cache[data.data.id] = data.data.name;
      const author = data.data.authorName ? ('`' + data.data.authorName + '`') : ':ghost:'
      rooms.forEach((room) => {
        return robot.messageRoom(room, `Le déploiement de l'application \`${data.data.name}\` par ${author} a été un succès :slightly_smiling_face:`);
      });
    }
    return res.end("");
  });
};
