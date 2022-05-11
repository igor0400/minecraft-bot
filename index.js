const mineflayer = require('mineflayer');
const pvp = require('mineflayer-pvp').plugin;
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const armourManager = require('mineflayer-armor-manager');
const autoeat = require('mineflayer-auto-eat');
const collectBlock = require('mineflayer-collectblock').plugin;
const { GoalFollow } = goals;

const bot = mineflayer.createBot({
  host: 'localhost',
  username: 'Tony',
  port: process.argv[2],
  logErrors: false,
  // version: false,
  // auth: 'mojang'
});

bot.loadPlugin(pvp);
bot.loadPlugin(armourManager);
bot.loadPlugin(pathfinder);
bot.loadPlugin(autoeat);
bot.loadPlugin(collectBlock);

// переменные

let activeFollow = false;
let collecting = false;
let guarding = true;
let homePos = null;
let mcData;

const jokes = [
  'velkaa: что там?\nlav: Стасег красафчег\nlav: Я его надоумил попробовать в Майнкрафт на геймпаде поиграть\nlav: Он подключил ПИЛОТНЫЙ РУЛЬ и теперь у него не песочница, а СИМУЛЯТОР ЭКСКАВАТОРА',
  'Нуб и опытный игрок бродят по серверу.Вдруг нуб говорит:\n- А чё это за огурец к нам бежит? А может мне подойти поближе...',
  'Приходит ГГ (главный герой) как то домой после шахты уставший, камней столько, хоть великую китайскую стену строй. Смотрит а там криппер с херобрином тортик едят. Херобрин говорит:\nПривет, друг устал? садись к нам тортик кушать.\nГГ:\nНе те грибы были в тарелке…',
  'Ну значит урок.\nСидят зомби за партами. Вдруг врывается в кабинет крипер, и не здороваясь садится на место.\nУчительница (херобрин) :\n-Крипер! Выйди и зайди как заходит домой твой папа-крипер!\nОн выходит, с размаха открывает дверь, и орет :\n- НУ ЧТО СВОЛОЧИ, НЕ ЖДАЛИ?!',
  'Забрели как-то крипера, зомби, и скелета на необитаемый остров.\nТут набежали херобрины, сказали : тот кто пробежит быстрее, и соберет 10 блоков или предметов, того отпустим.\nНу бежит значит крипер. Насобирал 10 батонов.\nПрибегает, ему говорят : засунь их себе в ж*пу, тогда отпустим\nНу он засунул 8 и умер.\nТут бежит зомби. Принес 10 горсток сахара. Ну засунул, и стоит.\nЕму говорят : что стоишь, идти уже можешь\nА он : Да скелет там мечей насобирал, посмотреть хочу',
  'Ехали парни из клана на сервере воевать с другим кланом. Такие все мрачные — у всех ведь алмазные шмотки, жаль терять. А командир такой говорит:\n- Да ладно вам, ребят. Зато, прикиньте, за каждого убитого нам дадут по 1000 на человека!\nНу они такие все стали боевыми и веселыми, уже приготовились. Как только вагонетки останавливаются, они как вылетают с луками и мечами! Командир только рот раскрыл. Через полчаса вернулись они, все в крови, с новейшими шмотками и с головами игроков. А командир че-то в обморок упал. Они его в чувство привели, а он им:\n- Ребята, да вы че, о***ли? Мы же в городе остановились для перекуса!',
  '-Жизнь так жестока в MineCraft.\n-Что? Тебя кто-то убил?\n-Да!\n-И кто же?\n-Кактус! :,((',
];

const moods = [
  'всё ок',
  'хорошо',
  'нормально',
  'не очень, меня сегодня взорвал крипер, было больно :(',
  'бывало и лучше',
  'очень хорошо, сегодя нашёл кладку алмазов :)',
  'мне уже надоели эти зомбаки',
  'отлично, спасибо за беспокойствие',
  'очень волнуюсь, сегодня хочу одолеть дракона',
  'всё супер, вчера занял первое место в конкурсе поединков',
  'сегодня прекрасная погода, неправда ли?',
];

// смена параметров при спавне

bot.once('spawn', () => {
  mcData = require('minecraft-data')(bot.version);
  setHomePos(bot.spawnPoint);
  bot.chat('здарова ублюдки');
});

// отслеживание ресурспаков

bot.once('resourcePack', () => {
  bot.acceptResourcePack();
});

// коогда что то выбрасывается

bot.on('playerCollect', (collector, itemDrop) => {
  if (collector !== bot.entity) return;

  // взять мечь

  setTimeout(() => {
    const sword = bot.inventory
      .items()
      .find((item) => item.name.includes('sword'));
    if (sword) bot.equip(sword, 'hand');
  }, 150);

  // взять щит

  setTimeout(() => {
    const shield = bot.inventory
      .items()
      .find((item) => item.name.includes('shield'));
    if (shield) bot.equip(shield, 'off-hand');
  }, 250);
});

// прийти к игроку

function guardArea(pos) {
  setHomePos(pos.clone());

  if (!bot.pvp.target) {
    moveToPos(homePos);
  }
}

function stopGuarding() {
  bot.pvp.stop();
  bot.pathfinder.setGoal(null);
  if (homePos) {
    moveToPos(homePos);
  }
}

function moveToPos(position) {
  bot.pathfinder.setMovements(new Movements(bot, mcData));

  bot.pathfinder.setGoal(
    new goals.GoalBlock(position.x, position.y, position.z)
  );
}

function attackSome(entity) {
  if (entity) {
    const sword = bot.inventory
      .items()
      .find((item) => item.name.includes('sword'));
    if (sword) bot.equip(sword, 'hand');
    bot.pvp.attack(entity);
  }
}

function setHomePos(position) {
  if (Math.floor(position.y) !== position.y) {
    homePos = { ...position, y: position.y + 1 };
    return;
  }
  homePos = position;
}

// авто еда

bot.once('spawn', () => {
  bot.autoEat.options = {
    priority: 'foodPoints',
    startAt: 14,
    bannedFood: [
      'golden_apple',
      'enchanted_golden_apple',
      'rotten_flesh',
      'poisonous_potato',
      'pufferfish',
    ],
  };
});

function findEat() {
  const food = [
    'stew',
    'cooked',
    'pumpkin_pie',
    'soup',
    'carrot',
    'honey_bottle',
    'potato',
    'bread',
    'apple',
    'beef',
    'rabbit',
    'porkchop',
    'berries',
    'melon_slice',
    'chicken',
    'cod',
    'salmon',
    'cookie',
    'mutton',
    'beetroot',
    'tropical_fish',
    'dried_kelp',
  ];

  const filterFood = food.filter((item) =>
    bot.inventory.items().find((elem) => elem.name.includes(item))
  );

  if (filterFood.length === 0) {
    bot.chat('У меня закончилась еда!');
  }
}

bot.on('health', () => {
  findEat();
  if (bot.food === 20) bot.autoEat.disable();
  else bot.autoEat.enable();

  if (Math.floor(bot.health) === 6)
    bot.chat(`Твою мать! ${bot.health.toFixed(1) / 2}хп осталось`);
});

// добывать еду

const foodMobs = ['pig'];

async function collectFood() {
  const filter = (e) =>
    e.type === 'mob' &&
    e.position.distanceTo(bot.entity.position) < 100 &&
    foodMobs.map((mob) => (e.name === mob ? true : false));

  const entity = bot.nearestEntity(filter);
  if (entity) {
    bot.chat('Иду добывать еду');
    // moveToPos(entity.position);
    console.log(entity);
  } else bot.chat('Я не нашёл мобов для добычи еды');
}

// остановка атаку

bot.on('stoppedAttacking', () => {
  if (homePos && !activeFollow && !collecting) {
    moveToPos(homePos);
    return;
  }

  if (activeFollow) {
    followPlayer(activeFollow);
  }

  if (collecting) {
    bot.chat(`Не у далось дособирать ${collecting}, мне помешал монстр`);
    collecting = false;
    moveToPos(homePos);
  }
});

// смотреть на ближайшего игрока

bot.on('physicTick', () => {
  if (bot.pvp.target || bot.pathfinder.isMoving() || collecting) return;

  const filterEntity = (entity) =>
    entity.type === 'player' &&
    entity.position.distanceTo(bot.entity.position) < 16;
  const entity = bot.nearestEntity(filterEntity);
  if (entity) bot.lookAt(entity.position.offset(0, entity.height, 0));
});

// атаковать ближайших мобов

const attacksMobs = [
  'Phantom',
  'Blaze',
  'Ghast',
  'Magma Cube',
  'Silverfish',
  'Skeleton',
  'Slime',
  'Spider Jockey',
  'Zombie',
  'Zombie Villager',
  'Drowned',
  'Wither Skeleton',
  'Witch',
  'Vindicator',
  'Evoker',
  'Pillager',
  'Ravager',
  'Vex',
  'Evocation Fang',
  'Chicken Jockey',
  'Piglin Brute',
  'Hoglin',
  'Zoglin',
  'Endermite',
  'Guardian',
  'Elder Guardian',
  'Shulker',
  'Skelton Cavalry',
  'Husk',
  'Stray',
  'Ender Dragon',
  'Wither',
];

bot.on('physicTick', () => {
  if (!guarding) return;

  const filter = (e) =>
    e.type === 'mob' &&
    e.position.distanceTo(bot.entity.position) < 8 &&
    attacksMobs.map((mob) => (e.mobType === mob ? true : false));
  const entity = bot.nearestEntity(filter);
  attackSome(entity);
});

// идти спать

bot.on('sleep', () => {
  bot.chat('Спакойной ночки!');
});

bot.on('wake', () => {
  bot.chat('Доброе утро!');
});

async function goToSleep() {
  const bed = bot.findBlock({
    matching: (block) => bot.isABed(block),
  });
  if (bed) {
    try {
      await bot.sleep(bed);
    } catch (err) {
      return;
    }
  } else {
    bot.chat('Нет кровати поблизости');
  }
}

async function wakeUp() {
  try {
    await bot.wake();
  } catch (err) {
    bot.chat(`Я не могу проснуться: ${err.message}`);
  }
}

bot.on('entitySleep', () => {
  goToSleep();
});

bot.on('entityWake', () => {
  wakeUp();
});

// следовать за игроком

function followPlayer(player) {
  activeFollow = player;
  const playerCI = bot.players[player];

  if (!playerCI || !playerCI.entity) {
    bot.chat('Я не вижу цель');
    return;
  }

  const movements = new Movements(bot, mcData);
  movements.scafoldingBlocks = [];

  bot.pathfinder.setMovements(movements);

  const goal = new GoalFollow(playerCI.entity, 1);
  bot.pathfinder.setGoal(goal, true);
}

function stopFollow() {
  if (activeFollow) {
    bot.chat(`Я больше не следую за ${activeFollow}`);
  }
  activeFollow = false;
}

// собирать блоки

async function collectBlocks(args) {
  let count = 1;
  if (args[2]) count = parseInt(args[2]);

  const blockType = mcData.blocksByName[args[1]];
  if (!blockType) {
    bot.chat('Я не знаю блоков с таким названием');
    return;
  }

  const blocks = bot.findBlocks({
    matching: blockType.id,
    maxDistance: 64,
    count: count,
  });

  if (blocks.length === 0) {
    bot.chat('Нет таких болоков поблизости');
    return;
  }

  const targets = [];
  for (let i = 0; i < Math.min(blocks.length, count); i++) {
    targets.push(bot.blockAt(blocks[i]));
  }
  bot.chat(`Иду собирать ${targets.length} ${blockType.displayName}`);

  try {
    collecting = blockType.displayName;
    await bot.collectBlock.collect(targets);
    stopCollect();
    bot.chat('Готово');
    moveToPos(homePos);
    bot.chat('Я домой');
  } catch (err) {
    bot.chat(`Ошибка: ${err.message}`);
    moveToPos(homePos);
    bot.chat('Я домой');
  }
}

function stopCollect() {
  if (collecting) {
    bot.chat(`Я больше не собираю ${collecting}`);
    collecting = false;
  }
}

// охрана дома

function trueGuarding() {
  guarding = true;
  bot.chat('Теперь я охраняю точку дома');
}

function falseGuarding() {
  guarding = false;
  bot.chat('Я больше не охраняю точку дома');
}

// рандомное число

function randomInteger(min, max) {
  let rand = min + Math.random() * (max + 1 - min);
  return Math.floor(rand);
}

// команды

bot.on('chat', (username, message) => {
  if (username === bot.username) return;

  if (username === 'Swingor') {
    switch (message.toLowerCase().split(' ')[0]) {
      case 'fight':
        stopCollect();
        stopFollow();
        const fightPlayer = bot.players[message.split(' ')[1]];

        if (!fightPlayer) {
          bot.chat('Я не вижу цель');
          return;
        }

        bot.chat('Тебе хана!');
        attackSome(fightPlayer.entity);
        break;
      case 'come':
        stopCollect();
        stopFollow();
        let comePlayer = bot.players[message.split(' ')[1]].entity.position;

        if (Math.floor(comePlayer.y) !== comePlayer.y) {
          comePlayer = { ...comePlayer, y: comePlayer.y + 1 };
        }

        moveToPos(comePlayer);
        bot.chat('Уже бегу!');
        break;
      case 'go':
        stopCollect();
        stopFollow();
        const cords = {
          x: message.split(' ')[1],
          y: message.split(' ')[2],
          z: message.split(' ')[3],
        };

        moveToPos(cords);
        break;
      case 'collect':
        const args = message.split(' ');
        if (args[1]) {
          if (args[1].toLowerCase() !== 'food') {
            collectBlocks(args);
            return;
          }
          if (args[1].toLowerCase() === 'food') {
            collectFood();
            return;
          }
        }
        break;
    }

    switch (message.toLowerCase()) {
      case 'stop fight':
        stopGuarding();
        bot.chat('Так уж и быть, пожалею тебя');
        break;
      case 'go home':
        if (!homePos) {
          bot.chat('У меня нет дома');
          return;
        }
        stopCollect();
        stopGuarding();
        stopFollow();
        moveToPos(homePos);
        bot.chat('Бегу домой');
        break;
      case 'sethome':
        stopCollect();
        stopGuarding();
        stopFollow();
        const guardPlayer = bot.players[username];

        if (!guardPlayer) {
          bot.chat('Я не вижу цель');
          return;
        }

        guardArea(guardPlayer.entity.position);
        bot.chat('Теперь это мой дом');
        break;
      case 'follow':
        stopCollect();
        followPlayer(username);
        bot.chat('Я следую за тобой');
        break;
      case 'stop follow':
        stopFollow();
        bot.pathfinder.setGoal(null);
        bot.chat('Я больше не следую за тобой');
        break;
      case 'guarding':
        trueGuarding();
        break;
      case 'stop guarding':
        falseGuarding();
        break;
    }
  }

  switch (message.toLowerCase()) {
    case 'привет':
      bot.chat('Привет друг');
      break;
    case 'как дела':
      bot.chat(moods[randomInteger(0, moods.length)]);
      break;
    case 'расскажи анекдот':
      bot.chat(jokes[randomInteger(0, jokes.length)]);
      break;
  }
});
