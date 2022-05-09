const mineflayer = require('mineflayer');
const pvp = require('mineflayer-pvp').plugin;
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const armourManager = require('mineflayer-armor-manager');
const autoeat = require('mineflayer-auto-eat');
const mineflayerViewer = require('prismarine-viewer').mineflayer;

const bot = mineflayer.createBot({
  host: 'localhost',
  username: 'Tony',
  port: 58466,
  logErrors: false,
  // version: false,
  // auth: 'mojang'
});

bot.loadPlugin(pvp);
bot.loadPlugin(armourManager);
bot.loadPlugin(pathfinder);
bot.loadPlugin(autoeat);

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

let guardPos = null;

function guardArea(pos) {
  setGuardPos(pos.clone());

  if (!bot.pvp.target) {
    moveToPos(guardPos);
  }
}

function stopGuarding() {
  bot.pvp.stop();
  bot.pathfinder.setGoal(null);
  if (guardPos) {
    moveToPos(guardPos);
  }
}

function moveToPos(position) {
  const mcData = require('minecraft-data')(bot.version);
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

function setGuardPos(position) {
  if (Math.floor(position.y) !== position.y) {
    guardPos = { ...position, y: position.y + 1 };
    return;
  }
  guardPos = position;
}

// авто еда

bot.once('spawn', () => {
  bot.autoEat.options = {
    priority: 'foodPoints',
    startAt: 14,
    bannedFood: [],
  };
});

bot.on('autoeat_started', () => {
  bot.chat('Надо подкрепиться');
});

bot.on('health', () => {
  if (bot.food === 20) bot.autoEat.disable();
  if (bot.food < 17) bot.autoEat.enable();
  if (Math.floor(bot.health) === 6)
    bot.chat(`Твою мать! ${bot.health.toFixed(1) / 2}хп осталось`);
});

// остановить атаку

bot.on('stoppedAttacking', () => {
  if (guardPos) {
    moveToPos(guardPos);
  }
});

// смотреть на ближайшего игрока

bot.on('physicTick', () => {
  if (bot.pvp.target) return;
  if (bot.pathfinder.isMoving()) return;

  const filterEntity = (entity) =>
    entity.type === 'player' &&
    entity.position.distanceTo(bot.entity.position) < 16;
  const entity = bot.nearestEntity(filterEntity);
  if (entity) bot.lookAt(entity.position.offset(0, entity.height, 0));
});

// атаковать ближайших мобов

bot.on('physicTick', () => {
  if (!guardPos) return;

  const filter = (e) =>
    e.type === 'mob' &&
    e.position.distanceTo(bot.entity.position) < 8 &&
    e.mobType !== 'Armor Stand';

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
      bot.chat('Я сплю');
    } catch (err) {
      bot.chat(`Я не могу уснуть: ${err.message}`);
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

// команды

bot.on('chat', (username, message) => {
  if (username === bot.username) return;

  if (username === 'Swingor') {
    switch (message.toLowerCase().slice(0, 5)) {
      case 'fight':
        const fightPlayer = bot.players[message.substr(6)];

        if (!fightPlayer) {
          bot.chat('Я не вижу цель');
          return;
        }

        bot.chat('Тебе хана!');
        attackSome(fightPlayer.entity);
        break;
    }

    switch (message.toLowerCase()) {
      case 'stop fight':
        stopGuarding();
        bot.chat('Так уж и быть, пожалею тебя');
        break;
      case 'go home':
        if (!guardPos) {
          bot.chat('У меня нет дома');
          return;
        }
        moveToPos(guardPos);
        bot.chat('Бегу домой');
        break;
      case 'guard':
        const guardPlayer = bot.players[username];

        if (!guardPlayer) {
          bot.chat('Я не вижу цель');
          return;
        }

        bot.chat('Теперь это мой дом');
        guardArea(guardPlayer.entity.position);
        break;
    }

    switch (message.toLowerCase().slice(0, 4)) {
      case 'come':
        let comePlayer = bot.players[message.substr(5)].entity.position;

        if (Math.floor(comePlayer.y) !== comePlayer.y) {
          comePlayer = { ...comePlayer, y: comePlayer.y + 1 };
        }

        moveToPos(comePlayer);
        bot.chat('Уже бегу!');
        break;
    }
  } else {
    if (message.toLowerCase().slice(0, 5) === 'fight') {
      bot.chat('Я тебя не слушаюсь');
    }
  }

  if (message.toLowerCase() === 'привет') {
    bot.chat('Привет друг');
  }
});