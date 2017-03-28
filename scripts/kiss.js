
// Description:
//   Give kisses
//
// Dependencies:
//   None
//
// Configuration:
//   None
//
// Commands:
//   hubot give a kiss to @emmanuel - Give a kiss to @emmanuel
//
// Author:
//   So-Use Team


module.exports = (robot) => {

  robot.respond(/give a kiss to @(.*)/i, (res) => {
    const to = res.match[1]
    res.send(`@${to} :kiss: de la part de @${res.envelope.user.name} ;-)`);
  })
}
