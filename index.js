const mineflayer = require('mineflayer');
const pvp = require('mineflayer-pvp').plugin;
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const armourManager = require('mineflayer-armor-manager');
const autoeat = require('mineflayer-auto-eat');
const collectBlock = require('mineflayer-collectblock').plugin;
const { GoalFollow } = goals;

const {
  moods,
  jokes,
  inventoryFood,
  foodMobs,
  needFood,
  attacksMobs,
} = require('./someData');

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
  const filterFood = inventoryFood.filter((item) =>
    bot.inventory.items().find((elem) => elem.name.includes(item))
  );

  if (filterFood.length === 0) {
    bot.chat('У меня закончилась еда!');
  }
}

bot.on('health', () => {
  findEat();
  if (bot.inventoryFood === 20) bot.autoEat.disable();
  else bot.autoEat.enable();

  if (Math.floor(bot.health) === 6)
    bot.chat(`Твою мать! ${bot.health.toFixed(1) / 2}хп осталось`);
});

// добывать еду

function checkNeedFood() {
  let ifFood = false;
  needFood.map((elem) => {
    if (!ifFood) {
      const invItem = bot.inventory
        .items()
        .find((item) => item.name.includes(elem));
      if (invItem) invItem.count > 20 ? (ifFood = true) : null;
    }
  });
  return ifFood;
}
// НЕ РАБОТАЕЕЕЕЕЕЕЕЕЕЕЕЕЕЕЕЕЕЕЕЕЕЕЕЕЕЕЕЕЕЕЕЕЕЕЕЕЕЕЕЕЕЕЕЕЕЕЕЕЕЕЕЕЕЕЕЕЕЕЕЕЕЕЕЕЕЕЕЕЕЕЕЕЕЕЕЕЕЕЕЕЕЕТТТТ!!!!!!!!!!!!!!!!!!!!!!
async function collectFood() {
  if (!checkNeedFood()) {
    const filter = (e) =>
      e.type === 'mob' &&
      e.position.distanceTo(bot.entity.position) < 100 &&
      foodMobs.includes(e.mobType);

    const entity = bot.nearestEntity(filter);
    if (entity) {
      collecting = entity.mobType;
      bot.chat('Иду добывать еду');
      await moveToPos(entity.position);
      await attackSome(entity);
      // await collectFood();
    } else bot.chat('Я не нашёл мобов для добычи еды');
  } else {
    bot.chat('Еды достаточно, я домой');
    moveToPos(homePos);
  }
}

bot.on('itemDrop', (item) => {
  if (item.position.distanceTo(bot.entity.position) < 10 && collecting) {
    collecting = false;
    moveToPos(item.position);
  }
});

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

bot.on('physicTick', () => {
  if (!guarding) return;

  const filter = (e) =>
    e.type === 'mob' &&
    e.position.distanceTo(bot.entity.position) < 8 &&
    attacksMobs.includes(e.mobType);
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
