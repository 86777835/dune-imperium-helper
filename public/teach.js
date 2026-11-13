// Teach page: a script the teacher reads aloud to start a first game, written from the official Simplified Chinese
// rulebooks (same wording as tools/讲解稿.md). It names every important element in a sentence and leaves the fine
// rulings to the rules assistant. Terms in {text|id} open a note with a picture cropped from the rulebook
// (img/teach/<icon>.webp); the 「问」 buttons and each note's 「问规则助手」 ask the rules assistant (chat.js) straight away.
// Two editions, chosen at the top: 'b' Dune: Imperium, 'u' Uprising. The hub's box link (?v=base|uprising) picks it;
// otherwise this phone's last choice. A line, question, note or term field is for both, or {b, u} per edition
// (a missing key means that edition leaves it out). After the script, 注意事项 (NOTES) lists the easy-to-get-wrong points.
// Pictures: Dire Wolf's official Simplified Chinese rulebooks, credited in the footer.

// mode: 'b' base game, 'u' Uprising
const V = new URLSearchParams(location.search).get('v');
let mode = V === 'base' ? 'b' : V === 'uprising' ? 'u' : null;
try { mode ||= localStorage.getItem('dune-teach-mode'); } catch {}
if (mode !== 'b' && mode !== 'u') mode = 'u';
const pick = x => x == null || typeof x === 'string' ? x : x[mode];   // for both editions, or {b, u}

const ICON = (id, cls = '') => id ? `<img class="ico ${cls}" src="/img/teach/${id}.webp" alt="">` : '';

// id: name, where you see it on the table, what it means; icon: a picture in img/teach/; m: only in one edition.
const TERMS = {
  vp: { name: '胜利点数', icon: 'vp', where: '金色的球形图标；版图边上的分数轨。', what: '拿到就把分数指示物往前移。某一轮结束时有人到 10 分，游戏结束。' },
  leader: { name: '领袖牌', icon: 'leader', where: '每人面前一张大牌，开局选或随机发。', what: '左边的能力一直有效；右边印着印戒标志的能力，要在特使回合打出印戒牌时才发动。特使先放在领袖牌上。' },
  signet: { name: '印戒', icon: 'signet', where: '起始牌库里的「印戒」牌，以及领袖牌右边。', what: '在特使回合打出印戒牌，就发动你领袖牌上的印戒能力。' },
  starter: { name: '起始牌库', icon: 'starter', where: '每人 10 张，左上角带同一个小图标，洗好放在领袖牌左边。', what: '你的牌库。每轮开始抽 5 张当手牌，买来的新牌进弃牌堆，洗回来后牌库越来越强。' },
  agent: { name: '特使', icon: 'agent', where: '你颜色的小人，开局 2 个放在领袖牌上。', what: '你的工人。特使回合打 1 张牌，派 1 名特使去版图上的一个地点。召回阶段收回。' },
  swordmaster: { name: '剑术大师', icon: 'swordmaster', where: '版图上的「剑术大师」地点；第 3 名特使开局先放在版图旁。', what: { b: '付 8 宇宙索派特使去，拿回第 3 名特使，本轮就能用。一局只能去一次。', u: '付 8 宇宙索派特使去，拿回第 3 名特使，本轮就能用；已经有人拿过后，其他人只要 6 宇宙索。一局只能去一次。' } },
  troop: { name: '军队', icon: 'troop', where: '你颜色的方块。图标是一个灰色立方体。', what: '这个图标就是「征兵」：从个人供应区拿 1 支军队进军营。冲突区里每支军队 2 点战力。' },
  zone: { name: '冲突区和军营', icon: 'zone', where: '版图中间印着交叉双剑的区域是冲突区，四角的圆圈是各人的军营。', what: '军营里的兵只是待命，不算战力；部署进冲突区的兵才参加本轮冲突。开局军营里放 3 支军队。' },
  combatspace: { name: '战斗地点', icon: 'combatspace', where: '地点图片右下角有交叉双剑的标志。', what: '派特使到这里时，本回合征的兵可以直接部署进冲突区，另外还能从军营派最多 2 支。' },
  combatmarker: { name: '战力指示物', icon: 'combatmarker', where: '你颜色的方形标记，放在版图的战力轨上。', what: '记你本轮冲突的战力，揭示时往上推。超过 20 翻到 +20 那面。战斗结束后归零。' },
  objective: { name: '目标牌', icon: 'objective', m: 'u', where: '开局每人随机发 1 张，背面是交叉的旗子。', what: '印着先手标记的人先手；牌上还有一个作战图标，可以和赢来的冲突牌配对得分。' },
  firstplayer: { name: '先手标记', icon: 'firstplayer', where: '圆形的沙虫木标记。', what: { b: '拿着它的人每轮先行动；召回阶段顺时针传给下一位。开局随机定。', u: '拿着它的人每轮先行动；召回阶段顺时针传给下一位。开局由目标牌决定。' } },
  board: { name: '游戏版图', icon: { b: 'board', u: 'uboard' }, where: '桌子中间的大版图：左边一列是四大派系，上方是兰兹拉德，中间和右边是沙丘星球上的地点。', what: '每个地点左上角印着特使图标，只能用对应图标的牌派特使去；一个地点一轮只能有一名特使。' },
  agenticon: { name: '特使图标', icon: { b: 'agenticons', u: 'uagenticons' }, where: '帝国牌左边的小图标，版图上每个地点的左上角。', what: { b: '共 7 种：四大派系、兰兹拉德（绿五边形）、城市（蓝圆）、香料贸易（黄三角）。牌上有哪个图标，就能派特使去印着同样图标的地点。', u: '共 8 种：四大派系、兰兹拉德（绿五边形）、城市（蓝圆）、香料贸易（黄三角），以及起义新增的间谍（眼睛）。牌上有哪个图标，就能派特使去印着同样图标的地点。' } },
  space: { name: '地点', icon: 'space', where: '版图上一个个带图片的格子，左上角是特使图标，旁边可能印着费用。', what: '派特使去就拿印着的效果。有费用的，派之前就要付得起。别人占了的地点不能去。' },
  arrow: { name: '白箭头', icon: 'arrow', where: '牌和版图上的白色箭头。', what: '「付费换效果」：箭头左边或上方是费用，右边或下方是收益。可以不付；付的话只付一份。' },
  faction: { name: '四大派系', icon: 'factions', where: '版图左边四条影响力轨：皇帝、宇航公会、贝尼·杰瑟里特姐妹会、弗雷曼人。', what: '派特使到派系地点，影响力 +1。到 2 点得 1 分，到 4 点拿那一格奖励，第一个到 4 点的人拿结盟标记。' },
  alliance: { name: '结盟标记', icon: 'alliance', where: '四枚圆标记，开局放在四个派系轨的顶端。', what: '第一个在该派系到 4 点影响力的人拿走，得上面的分；之后有人超过你，标记和分都归他。' },
  council: { name: '最高委员会', icon: 'disks', where: '兰兹拉德区的一个地点；你的两个圆片，一个记分，一个是议员指示物。', what: { b: '付 5 宇宙索派特使去，放上议员指示物，以后每个揭示回合多 2 招募点数。基础版一局只能去一次。', u: '付 5 宇宙索派特使去，放上议员指示物，以后每个揭示回合多 2 招募点数。已经有席位再去，改拿 2 香料、1 张密谋牌、征兵 3 次。' } },
  mentat: { name: '门泰特', icon: 'mentat', m: 'b', where: '灰色的门泰特木人，放在兰兹拉德区的门泰特地点。', what: '付 2 宇宙索派特使去，抽 1 张牌，把门泰特拿到你的领袖牌上，本轮当一名额外特使用。召回阶段放回原位。' },
  spice: { name: '香料', icon: 'spice', where: '橙色六边形；图标里的数字是数量。', what: '最重要的资源。在造物主地点收，用来付很多地点和牌的费用。' },
  solari: { name: '宇宙索', icon: 'solari', where: '灰色圆片；图标里的数字是数量。', what: '这个世界的钱。最高委员会、剑术大师、很多兰兹拉德地点要付它。' },
  water: { name: '水', icon: 'water', where: '蓝色水滴，开局每人 1 个。', what: '沙漠地点常要付水；一些弗雷曼人地点给水。' },
  maker: { name: '造物主', icon: 'maker', where: { b: '大平原、哈戈盆地、帝国盆地三个地点上的沙虫图标。', u: '沙漠腹地、哈戈盆地、帝国盆地三个地点上的沙虫图标。' }, what: '派特使去收地点印着的香料，再加上面囤着的全部香料。每轮造物主阶段，没有特使的造物主地点各多放 1 香料。' },
  imperium: { name: '帝国牌', icon: 'imperium', where: '帝国牌库，翻开 5 张放在版图旁做供应区。', what: '用招募点数买，买来的牌进弃牌堆。上半部分是特使效果（左边是特使图标），下半部分是揭示效果，右上角是价格。' },
  reserve: { name: '储备区', icon: { b: 'reserve', u: 'ureserve' }, where: { b: '版图旁三堆固定的牌：厄拉科斯使团、香料永流传、空间折叠。', u: '版图旁两堆固定的牌：暗中准备、香料永流传。' }, what: { b: '揭示回合可以用招募点数买厄拉科斯使团和香料永流传；空间折叠只能靠空间折叠图标拿。', u: '揭示回合随时可以用招募点数买，和帝国牌供应区一样。' } },
  foldspace: { name: '空间折叠', icon: 'foldspace', m: 'b', where: '储备区里紫色星空的牌。', what: '不能用招募点数买，只能靠空间折叠图标拿。它能当任意特使图标用。' },
  persuasion: { name: '招募点数', icon: 'persuasion', where: '蓝色菱形图标，常说的「说服力」；牌右上角的蓝色菱形是价格。', what: '揭示回合用来买帝国牌和储备区的牌。用不完不能留到下一轮。' },
  sword: { name: '剑刃', icon: 'sword', where: '红色的剑图标，大多在牌的揭示效果里。', what: '每个剑刃让战力 +1。冲突区里没有你的兵时，剑刃加不上。' },
  conflict: { name: '冲突牌', icon: { b: 'conflict', u: 'uconflict' }, where: '冲突牌库，每轮翻一张放在版图上。', what: { b: '印着本轮冲突的三档奖励：战力第一、第二、第三各拿一档，第三档只在四人局发。', u: '印着本轮冲突的三档奖励：战力第一、第二、第三各拿一档，第三档只在四人和六人局发。赢家拿走这张牌，右上角是作战图标。' } },
  conflictdeck: { name: '冲突牌库', icon: 'conflictback', where: '背面印着 I、II、III 的牌。', what: '从上到下 1 张 I 级、5 张 II 级、4 张 III 级，共 10 张，一轮翻一张。翻完了游戏结束。' },
  control: { name: '控制标记', icon: 'control', where: '你颜色的旗帜形标记，赢了带控制奖励的冲突后放在那个地点下方。', what: { b: '厄拉奇恩、迦太格城、帝国盆地可以被控制。之后谁派特使去，你都拿旗帜上的奖励；再翻到这个地点的冲突，你可以从供应区放 1 支军队进冲突区。', u: '厄拉奇恩、香料加工厂、帝国盆地可以被控制。之后谁派特使去，你都拿旗帜上的奖励；再翻到这个地点的冲突，你可以从供应区放 1 支军队进冲突区。' } },
  intrigue: { name: '密谋牌', icon: 'intrigue', where: '黑底金色图案的小牌堆。', what: '抽到后背面朝下自己留着，打出时才亮出。分三种：阴谋（自己回合打）、战斗（战斗阶段打）、终局（游戏结束时打）。' },
  combatintrigue: { name: '战斗密谋牌', icon: 'combatintrigue', where: '红底的密谋牌，底部写着「战斗」。', what: '只在战斗阶段打，冲突区要有你的兵。大多是加剑刃。' },
  // Uprising
  spy: { name: '间谍', icon: 'spy', m: 'u', where: '你颜色的 3 个圆柱，放到版图上地点之间的哨站（小圆圈）上。', what: '有间谍图标时放 1 名到空哨站。之后派特使到相连地点时可以召回它：去别人已经占了的地点（渗透），或者抽 1 张牌（收集情报）。' },
  sandworm: { name: '沙虫', icon: 'sandworm', m: 'u', where: '公共供应区的沙虫标记。', what: '用沙虫图标召唤，直接进冲突区，每只 3 战力。冲突区里有你的沙虫，你领的冲突奖励翻倍。战斗后回公共供应区。' },
  hook: { name: '沙地钩', icon: 'hook', m: 'u', where: '公共供应区的 4 个沙地钩，拿到放进自己的军营。', what: '大多数召唤沙虫的效果要你先有沙地钩。在泰布穴地拿，每人一个，用了不会消耗。' },
  shieldwall: { name: '屏蔽场城墙', icon: 'shieldwall', m: 'u', where: '版图上的城墙板块，挡在厄拉奇恩、香料加工厂、帝国盆地前面。', what: '城墙还在时，这三个地点的冲突不能召唤沙虫。有爆破图标的效果可以把它移除，移除后整局都没了。' },
  wormdouble: { name: '沙虫翻倍', icon: 'wormdouble', m: 'u', where: '冲突牌上的奖励。', what: '冲突区里有你自己的沙虫，你领的那一档奖励翻倍一次。控制权和作战图标不翻倍。' },
  battleicons: { name: '作战图标', icon: 'battleicons', m: 'u', where: '冲突牌和目标牌右上角：晶牙匕、沙鼠、扑翼机。', what: '赢下冲突拿到冲突牌后，有两张图标相同的就翻面得 1 分。' },
  contract: { name: '合约', icon: 'contract', m: 'u', where: '宇联商会模组的合约板块，翻开 2 个放在兰兹拉德下方。', what: '可选模组。拿到后完成上面的要求就拿报酬。不用模组时，合约图标改为拿 2 宇宙索。' }
};

// The script: what to read aloud. Every important element gets one sentence; how it is ruled exactly is for the assistant.
const PARTS = [
  { title: '怎么赢', sec: 30, usec: 35, lines: [
    { b: '这局玩《沙丘：帝国》基础版。我先讲一遍主流程，讲完再一条条过注意事项。', u: '这局玩《沙丘：帝国 – 起义》。我先讲一遍主流程，讲完再一条条过注意事项。' },
    '我们各自是一个大家族，在沙丘星球上争香料、拉拢势力、打赢冲突。',
    '大家比{胜利点数|vp}：某一轮结束时有人到 10 分，或者冲突牌翻完，游戏结束，分最高的人赢。',
    { b: '分主要来自三处：打赢每轮的{冲突|conflict}、提高{四大派系|faction}的影响力、一些牌和{密谋牌|intrigue}。', u: '分主要来自四处：打赢每轮的{冲突|conflict}、提高{四大派系|faction}的影响力、凑齐{作战图标|battleicons}、一些牌和{密谋牌|intrigue}。' }
  ], ask: ['几分赢？最多几轮？', '谁先到目标分谁就赢吗？'] },
  { title: '你面前有什么', sec: 40, usec: 45, lines: [
    '每人一张{领袖牌|leader}：左边的能力一直有效，右边的能力要打出{印戒|signet}牌才发动。',
    '一副 10 张的{起始牌库|starter}，每轮开始抽 5 张当手牌。这是构筑牌库的游戏：用手牌买新牌，牌库越打越强。',
    '两名{特使|agent}，是你的工人；第三名要派特使去{剑术大师|swordmaster}，付钱才拿得到。',
    '{军队|troop}方块：开局 3 支在你的{军营|zone}里待命，打仗时再派上去。',
    { b: '开局每人 1 个水，四人局每人从 1 分起步。随机定先手，拿{先手标记|firstplayer}。', u: '开局每人 1 个水，四人局每人从 1 分起步。每人还有 3 名{间谍|spy}；开局抽一张{目标牌|objective}，印着先手标记的人先手。' }
  ], ask: ['开局每人拿什么？', { u: '起义怎么定先手？' }, '每轮手牌几张？'] },
  { title: '一轮五步', sec: 35, lines: [
    '每轮先翻一张{冲突牌|conflict}，这轮大家就争它的奖励；然后每人抽 5 张牌。',
    '接着从先手开始轮流，每次做一个回合：特使回合，或者揭示回合。这是一轮的主体。',
    '所有人都做完揭示回合，进入战斗，按战力发冲突奖励。',
    '最后，没人去的{造物主|maker}地点各多放 1 香料；收回特使，先手顺时针传下去。',
    '房间里的「流程」页会提示每一步，跟着点就行。'
  ], ask: ['造物主阶段和召回阶段做什么？', '全员揭示后马上领奖吗？'] },
  { title: '特使回合', sec: 55, usec: 65, lines: [
    '特使回合：打出 1 张手牌，看它左边的{特使图标|agenticon}，把一名特使派到{版图|board}上图标相同、没人占的{地点|space}。',
    '一张牌只派一名特使。地点有费用的，要先付得起；派好后拿地点效果，再加这张牌上半部分的特使效果，下半部分这时不算。',
    '派到{四大派系|faction}的地点，该派系影响力 +1：到 2 点得 1 分；第一个到 4 点的人拿{结盟标记|alliance}和上面的分。',
    '看到{白箭头|arrow}就是「付费换效果」，可以不付，付也只付一份。',
    { b: '几个特别的地点：{最高委员会|council}让你以后每次揭示多 2 招募点数；{门泰特|mentat}给你一名本轮的额外特使。', u: '特别的地点：{最高委员会|council}让你以后每次揭示多 2 招募点数。' },
    { u: '起义多了{间谍|spy}：先把间谍放到地点之间的哨站上，之后派特使到相连的地点时召回它，就能去别人已经占了的地点，或者多抽 1 张牌。' },
    '特使派完了，或者不想派了，轮到你就做揭示回合。'
  ], ask: ['没有可以派的地点怎么办？', '派系影响力到多少拿分？', { b: '门泰特怎么用？', u: '间谍怎么用？' }, '最高委员会席位有什么用？'] },
  { title: '资源和军队', sec: 30, usec: 40, lines: [
    '三种资源：{香料|spice}、{宇宙索|solari}（就是钱）、{水|water}。很多地点要付它们。',
    '派特使到{造物主|maker}地点收香料，连上面囤着的一起拿走。',
    '{军队|troop}图标就是征兵：从供应区拿一支军队进军营。',
    '派特使到带交叉双剑的{战斗地点|combatspace}时，这回合征的兵可以直接部署进{冲突区|zone}，另外还能从军营派最多 2 支。',
    { u: '起义还有{沙虫|sandworm}：有{沙地钩|hook}才能召唤，直接进冲突区，每只 3 战力；冲突地点在{屏蔽场城墙|shieldwall}后面时不能召唤。' }
  ], ask: ['收获香料怎么算？', '征兵和部署有什么区别？', { u: '沙虫怎么来、有什么用？' }] },
  { title: '揭示回合', sec: 35, lines: [
    '揭示回合：把剩下的手牌全部亮出来，用它们下半部分的揭示效果。',
    '{招募点数|persuasion}用来买牌：{帝国牌|imperium}供应区的 5 张，或者{储备区|reserve}的牌。买来的进弃牌堆，招募点数不能留到下一轮。',
    { b: '{剑刃|sword}加战力：冲突区每支军队 2 点，再加每个剑刃 1 点，推{战力指示物|combatmarker}记下来。冲突区没有兵，战力就是 0。', u: '{剑刃|sword}加战力：冲突区每支军队 2 点、每只沙虫 3 点，再加每个剑刃 1 点，推{战力指示物|combatmarker}记下来。冲突区没有战斗单位，战力就是 0。' },
    '做完揭示回合，这一轮你就不再行动了。'
  ], ask: ['怎么买牌？', '剑刃和战力有什么区别？', '派特使用过的牌还算揭示栏吗？'] },
  { title: '战斗和冲突', sec: 40, usec: 50, lines: [
    '所有人揭示完，进入战斗：冲突区有兵的人轮流打{战斗密谋牌|combatintrigue}或者跳过，大家都跳过了才结算。',
    { b: '{冲突牌|conflict}上三档奖励：战力第一拿第一档，第二拿第二档，第三档只在四人局发。打平都降一档，细节看注意事项。', u: '{冲突牌|conflict}上三档奖励：战力第一拿第一档，第二拿第二档，第三档只在四人和六人局发。打平都降一档，细节看注意事项。' },
    '赢下带控制奖励的冲突，在那个地点放{控制标记|control}，以后谁去那里你都拿一份奖励。',
    { u: '起义：冲突区里有你的沙虫，你领的奖励{翻倍|wormdouble}；赢家拿走冲突牌，凑齐两张相同的{作战图标|battleicons}得 1 分。' },
    '战斗后，冲突区的兵回个人供应区，不回军营。房间里的「冲突」页可以帮你算谁拿哪档。'
  ], ask: ['战斗奖励怎么发？', '冲突并列第一怎么发奖？', { u: '两只沙虫是四倍奖励吗？' }, '控制标记有什么用？'] },
  { title: '密谋牌和结束', sec: 30, lines: [
    '{密谋牌|intrigue}背面朝下自己留着：阴谋牌在自己回合打，战斗牌在战斗阶段打，终局牌在游戏结束时打。',
    '召回阶段检查：有人到 10 分，或者{冲突牌库|conflictdeck}翻完，就结束；先打终局密谋牌，再比分。',
    '同分依次比香料、宇宙索、水、军营里的军队。',
    '终局时每人在自己手机上填分。流程就这些，接下来过一遍注意事项。'
  ], ask: ['密谋牌什么时候能打？', '最终同分怎么判？'] }
];

// 注意事项: the easy-to-get-wrong points outside the main flow, gone through one by one after the script. Each is a
// title and a written answer (own words, from tools/faq.json and the rulebooks it cites); an answer may be {b, u}, and
// a third item 'b' / 'u' keeps a note to one edition. What isn't here goes to the rules assistant.
const NOTES = [
  ['派特使前先付得起', '地点的费用或影响力条件，要在派特使之前就满足，不能先拿收益再付钱。派好后，地点效果和这张牌的特使效果谁先谁后自己定；这张牌的揭示效果这时不算。一张牌只能用上面的一种特使图标，只派一名特使。'],
  ['白箭头只付一份', { b: '白箭头左边或上方是费用，右边或下方是收益。可以不付，不付就拿不到；付的话每次只付一份，比如「2 香料换征兵 3 次」不能付 4 香料征 6 次。', u: '白箭头左边或上方是费用，右边或下方是收益。可以不付，不付就拿不到；付的话每次只付一份，比如「2 水换抽 2 张牌」不能付 4 水抽 4 张。例外是沙虫翻倍的冲突奖励：翻倍的那份可以再付一次。' }],
  ['要 2 点影响力的地点', { b: '泰布穴地要弗雷曼人影响力 2 点以上才能派特使。牌上写着「2 影响力：」的效果也一样，要先有该派系 2 点影响力才能用。', u: '帝国特权（皇帝）、运输（宇航公会）、泰布穴地（弗雷曼人）三个地点，要对应派系影响力 2 点以上才能派特使。牌上写着「2 影响力：」的效果也一样。' }],
  ['派系的分会被拿走', '影响力到 2 点得的 1 分，掉回 2 以下就扣掉；到 4 点那一格的奖励拿了不用还。结盟标记光追平抢不走，要超过持有者才行。持有者自己掉到 3 点或以下、或被原来和他打平的人超过，就失去标记和它的分；好几人和他打平时由他选一位接手，没人有 4 点就放回版图。'],
  ['征兵和部署的上限', '这回合征来的兵（不管来自地点还是牌）都可以部署进冲突区，另外再从军营派最多 2 支。不能把军营里的兵「重新征一次」绕开 2 支的上限。派到非战斗地点时征的兵只能进军营，没部署的兵也进军营；个人供应区空了就征不了。'],
  ['冲突区没兵就是 0', { b: '冲突区里没有你的军队，战力就是 0，牌上的剑刃也加不上，拿不到任何冲突奖励，也不能打战斗密谋牌。军营里的兵不算战力。', u: '冲突区里没有你的军队或沙虫，战力就是 0，牌上的剑刃也加不上，拿不到任何冲突奖励，也不能打战斗密谋牌。军营里的兵不算战力。' }],
  ['冲突打平怎么发奖', { b: '最高的两人打平：都拿第二档，没人算赢；四人局其他人还能争第三档，三人局不再发奖。三人以上并列第一，都拿第二档，其他人没有奖。并列第二都拿第三档；并列第三都没有奖。战力 0 永远没有奖。', u: '最高的两人打平：都拿第二档，没人算赢，冲突牌也没人拿；四人、六人局其他人还能争第三档，三人以下不再发奖。三人以上并列第一，都拿第二档，其他人没有奖。并列第二都拿第三档；并列第三都没有奖。战力 0 永远没有奖。' }],
  ['战斗密谋牌的时机', '战斗阶段从先手开始轮流，冲突区有兵的人打一张或几张战斗密谋牌，或者跳过；跳过的人下次轮到还能打，所有人连续跳过才结算。写着「赢得冲突时」的牌，结算后由赢家决定打不打，打平不算赢。'],
  ['控制地点的两种好处', { b: '厄拉奇恩、迦太格城、帝国盆地被你控制后，任何人（包括你自己）派特使到那里，你都拿旗帜上的奖励：厄拉奇恩、迦太格城给 1 宇宙索，帝国盆地给 1 香料。再翻到这个地点的冲突牌时，你还能从供应区放 1 支军队进冲突区。', u: '厄拉奇恩、香料加工厂、帝国盆地被你控制后，任何人（包括你自己）派特使到那里，你都拿旗帜上的奖励：厄拉奇恩、香料加工厂给 1 宇宙索，帝国盆地给 1 香料。再翻到这个地点的冲突牌时，你还能从供应区放 1 支军队进冲突区。' }],
  ['买牌的细节', { b: '招募点数没花完，回合结束就没了。买来的牌进弃牌堆，不进手牌；供应区的空位马上补，新补的也能接着买。空间折叠不能用招募点数买，只能靠空间折叠图标拿。', u: '招募点数没花完，回合结束就没了。买来的牌进弃牌堆，不进手牌；供应区的空位马上补，新补的也能接着买。' }],
  ['招募效果只触发一次', '有些帝国牌在价格下方印着招募效果，买到时马上生效一次，以后打出不会再触发。买香料永流传得的分，之后销毁这张牌也不扣。'],
  ['揭示回合里抽到的牌', '揭示回合里抽到的牌要马上亮出来一起用；揭示之后才抽到的牌留到下一轮，下一轮照样再抽 5 张。'],
  ['密谋牌能不能留着', '阴谋牌只在自己的特使回合或揭示回合里打，不能留到终局当终局牌用；终局牌只在游戏结束时打。打出时要满足条件、付清费用。密谋牌抽完了，把弃牌堆洗成新牌库。'],
  ['剑术大师和最高委员会', { b: '剑术大师付 8 宇宙索，拿第 3 名特使，本轮就能用，一局只能去一次。最高委员会付 5 宇宙索，以后每个揭示回合多 2 招募点数，基础版一局只能去一次。', u: '剑术大师付 8 宇宙索，拿第 3 名特使，本轮就能用，一局只能去一次；已经有人拿过后，其他人只要 6 宇宙索。最高委员会付 5 宇宙索，以后每个揭示回合多 2 招募点数；已经有席位再去，改拿 2 香料、1 张密谋牌、征兵 3 次。' }],
  ['门泰特', '付 2 宇宙索派特使去，抽 1 张牌，把门泰特拿到你的领袖牌上，本轮当一名额外特使用。只能从门泰特地点拿，召回阶段放回原位。起义没有门泰特。', 'b'],
  ['间谍的细节', '有间谍图标时，放 1 名间谍到空哨站；3 名都在版图上时，可以先收回一名再放。召回间谍二选一：渗透（无视别人的特使照样派）或收集情报（派好后、结算前抽 1 张牌）。两名间谍可以一个渗透、一个收集情报，不能两个都收集情报。间谍特使图标能直接派到间谍所在哨站相连的地点，不用召回。', 'u'],
  ['沙虫翻倍怎么算', '冲突区里有你自己的沙虫，你领的那一档奖励翻倍一次，两只也只翻一次；第二、第三档，以及打平降档后领的，也照样翻倍。别人的沙虫不影响你。控制权和作战图标不翻倍；要付费的奖励，翻倍那份要再付。', 'u'],
  ['沙地钩和屏蔽场城墙', '多数沙虫图标要求军营里有沙地钩：在泰布穴地拿，每人一个，召唤沙虫不会用掉。城墙看的是本轮冲突争夺的地点，不是你特使去的地点：厄拉奇恩、香料加工厂、帝国盆地的冲突不能召唤沙虫，除非有人用爆破图标移除城墙，移除后整局都没了。', 'u'],
  ['作战图标怎么配对', '赢家拿走冲突牌后，看自己有没有两张图标相同（晶牙匕、沙鼠、扑翼机）的牌，有就把两张翻面，得 1 分；翻过的不能再配。目标牌上的图标也能参与配对。百搭图标留到游戏结束才配。', 'u'],
  ['合约（宇联商会模组）', '可选模组，首局建议不加；不用模组时，合约图标改为拿 2 宇宙索。用模组时从翻开的 2 个合约里拿 1 个，马上补。要在派特使之前就持有合约，满足条件必须完成，同一地点的几个合约一次一起完成。', 'u'],
  ['到 10 分不是马上赢', '游戏只在召回阶段检查结束：有人到 10 分或冲突牌库翻完。这一轮里别人还能反超。结束时先打终局密谋牌，再比总分；同分依次比香料、宇宙索、水、军营里的军队，还平就是最近一次做揭示回合的人赢。']
];

// Icon guide, grouped the way things sit on the table; terms of the other edition drop out.
const GROUPS = [
  ['分数和资源', ['vp', 'spice', 'solari', 'water', 'persuasion', 'sword']],
  ['你面前', ['leader', 'signet', 'starter', 'agent', 'troop', 'combatmarker', 'firstplayer', 'objective']],
  ['牌', ['imperium', 'reserve', 'foldspace', 'intrigue', 'combatintrigue', 'conflict', 'conflictdeck']],
  ['版图', ['board', 'agenticon', 'space', 'arrow', 'faction', 'alliance', 'council', 'swordmaster', 'mentat', 'maker', 'combatspace', 'zone', 'control']],
  ['起义新增', ['spy', 'sandworm', 'hook', 'shieldwall', 'wormdouble', 'battleicons', 'contract']]
];

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const icon = (id, cls) => ICON(pick(TERMS[id].icon), cls);
const term = (text, id) => `<button type="button" class="term" data-t="${id}">${icon(id)}${esc(text)}</button>`;
const line = s => esc(s).replace(/\{([^|}]+)\|(\w+)\}/g, (_, t, id) => term(t, id));
// inside a button the terms show their icon but are not buttons themselves
const label = s => esc(s).replace(/\{([^|}]+)\|(\w+)\}/g, (_, t, id) => `<span class="tlab">${icon(id)}${esc(t)}</span>`);
const ED = { b: '基础版', u: '起义' };
// the edition goes in front of every question, the way the hub's ask does, so the assistant answers for this edition
const asked = q => `（版本：${ED[mode]}）${q}`;
const askBtn = q => `<button type="button" class="tq" data-q="${esc(asked(q))}">问 <span>${label(q)}</span></button>`;
const only = list => list.map(pick).filter(Boolean);
const notes = () => NOTES.filter(n => !n[2] || n[2] === mode);
const secs = p => mode === 'u' && p.usec ? p.usec : p.sec;
const home = () => `/?v=${mode === 'b' ? 'base' : 'uprising'}`;   // the landing preselects this edition for a new room

function render() {
  const mins = Math.round(PARTS.reduce((t, p) => t + secs(p), 0) / 60);
  document.title = `${mins} 分钟讲规则 · 沙丘助手`;
  document.getElementById('ttl').textContent = `${mins} 分钟讲规则`;
  document.getElementById('back').href = home();
  document.getElementById('teach').innerHTML = `
  <div class="tmode" role="group" aria-label="这局玩哪个版本"><span>这局玩</span>
    <button type="button" data-mode="b" aria-pressed="${mode === 'b'}">基础版</button><button type="button" data-mode="u" aria-pressed="${mode === 'u'}">起义</button></div>
  <p class="tlead">讲的人照着念，约 ${mins} 分钟就能开局。<b>带下划线的词</b>点一下看图和解释；有疑问点「问」，规则助手马上回答。</p>
  <nav class="tnav">${PARTS.map((p, i) => `<a href="#p${i + 1}"><i>${i + 1}</i>${p.title}</a>`).join('')}<a href="#later">注意事项</a><a href="#icons">图标速查</a></nav>
  ${PARTS.map((p, i) => `<section class="tpart" id="p${i + 1}">
    <h2><span><i>${i + 1}</i>${p.title}</span><small>约 ${secs(p)} 秒</small></h2>
    ${only(p.lines).map(s => `<p class="tline">${line(s)}</p>`).join('')}
    <div class="tasks"><em>桌上常见疑问</em>${only(p.ask).map(askBtn).join('')}</div>
  </section>`).join('')}
  <section class="tpart" id="later">
    <h2><span><i>!</i>注意事项</span><small>${notes().length} 条</small></h2>
    <p class="tnote">流程讲完后，一条一条过一遍。这些是主流程之外容易出错、容易争的地方，点开念答案。</p>
    <div class="tnotes">${notes().map(([t, a, m], i) => `<details class="tni"><summary><i>${i + 1}</i>${esc(t)}${m === 'u' ? '<em class="tnw">起义</em>' : ''}</summary><p>${esc(pick(a))}</p>
      <button type="button" class="tq" data-q="${esc(asked(`「${t}」这一条我还有疑问，请再讲讲。`))}">还有疑问？问规则助手</button></details>`).join('')}</div>
    <p class="tnote">注意事项里没有的，点右下角「规则」问 AI，本站资料查不到会联网找。</p>
  </section>
  <a class="button primary big tgo" href="${home()}">讲完了，去建房间</a>
  <a class="button tgo" href="/guide.html">想看完整讲解和常见问题？去新手教程</a>
  <h2 class="ticons" id="icons">图标速查<small>点图标看解释</small></h2>
  ${GROUPS.map(([g, ids]) => [g, ids.filter(id => !TERMS[id].m || TERMS[id].m === mode)]).filter(([, ids]) => ids.length).map(([g, ids]) => `<section class="tgrid"><h3>${g}</h3><div>${ids.map(id => `<button type="button" class="tic" data-t="${id}">${icon(id)}<span>${TERMS[id].name}</span></button>`).join('')}</div></section>`).join('')}
  <p class="foot">依据官方规则书 · 图片截自 Dire Wolf 官方简体中文规则书（<a href="https://d19y2ttatozxjp.cloudfront.net/pdfs/SCN_DUNE_IMPERIUM_Rulebook_24-10-22.pdf" target="_blank" rel="noopener">基础版</a>、<a href="https://d19y2ttatozxjp.cloudfront.net/pdfs/SCN_DUNE_IMPERIUM_UPRISING_Rulebook.pdf" target="_blank" rel="noopener">起义</a>），版权归 Dire Wolf 所有 · 非官方玩家工具</p>`;
}
render();

// The note for a term: a sheet from the bottom with the picture, where it is and what it means.
const sheet = document.createElement('div');
sheet.className = 'tsheet hidden';
document.body.appendChild(sheet);
const close = () => sheet.classList.add('hidden');
function show(id) {
  const t = TERMS[id];
  sheet.innerHTML = `<div class="tsbg"></div><div class="tsbox" role="dialog" aria-label="${esc(t.name)}">
    <div class="tshd">${icon(id, 'big')}<b>${esc(t.name)}</b><button type="button" class="tsx" aria-label="关闭">×</button></div>
    <p><em>在哪儿看到</em>${esc(pick(t.where))}</p><p><em>什么意思</em>${esc(pick(t.what))}</p>
    <button type="button" class="button dark tsask" data-q="${esc(asked(`「${t.name}」是什么，怎么用？`))}">还不懂？问规则助手</button></div>`;
  sheet.classList.remove('hidden');
}
const ask = q => { close(); window.askRules?.(q); };
document.addEventListener('click', e => {
  const m = e.target.closest('[data-mode]');
  if (m) {
    if (m.dataset.mode === mode) return;
    mode = m.dataset.mode;
    try { localStorage.setItem('dune-teach-mode', mode); } catch {}
    return render();
  }
  const t = e.target.closest('[data-t]');
  if (t) return show(t.dataset.t);
  const q = e.target.closest('[data-q]');
  if (q) return ask(q.dataset.q);
  if (e.target.closest('.tsx,.tsbg')) close();
});
addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
