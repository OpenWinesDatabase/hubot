const hellos = ['hello', 'salut', 'bonjour', 'yo', 'hola', 'gutten tag', 'yop'];
const thanks = ['merci', 'thanks', 'thx', 'super', 'cool', 'bisous', 'awesome', 'great', 'wunderbar'];

module.exports = (robot) => {

  function respondToThanks(res) {
    res.send(`Pas de problème @${res.envelope.user.name}, c'est mon job 🤖`);
  }

  function respondToHello(res) {
    res.send(`Salut @${res.envelope.user.name}, n'hésitez pas à faire appel à moi 🤖`);
  }

  hellos.forEach(r => {
    robot.respond(new RegExp(r, 'i'), respondToHello);
    robot.hear(new RegExp(r + ' (hubot|@hubot)', 'i'), respondToHello);
  });

  thanks.forEach(r => {
    robot.respond(new RegExp(r, 'i'), respondToThanks);
    robot.hear(new RegExp(r + ' (hubot|@hubot)', 'i'), respondToThanks);
  });
};
