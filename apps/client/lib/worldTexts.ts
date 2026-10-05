/**
 * FireRed NPC and sign texts (pt-BR) keyed by `mapId:x,y` (ROM event
 * coordinates). Only objects listed in `WORLD_NPC_TEXT` are rendered from
 * the map's `world.json`; every other ROM object is either hand-authored
 * elsewhere (trainers, clerks, nurses, story NPCs) or deferred.
 */

export const WORLD_NPC_TEXT: Readonly<
  Record<string, readonly string[]>
> = {
  "pewter-city:6,15": [
    "Dizem que Clefairy veio da Lua. É o que se comenta.",
    "Eles apareceram depois que Moon Stones caíram no Mt. Moon.",
  ],
  "pewter-city:21,28": [
    "Não há muitos Treinadores Pokémon sérios por aqui.",
    "São quase todos Bug Catchers, só hobistas. Mas o Brock do Pewter Gym não é assim, nem um pouco.",
  ],
  "pewter-city:33,27": [
    "Psssst! Você sabe o que estou fazendo?",
    "Estou borrifando Repel para manter os Pokémon selvagens longe do meu jardim!",
  ],
  "route-3:70,13": [
    "Ufa… Melhor eu descansar… Ai, ai…",
    "Aquele túnel vindo de Cerulean cansa demais!",
  ],
  "cerulean-city:31,12": [
    "O pessoal daqui foi roubado.",
    "É óbvio que a Team Rocket está por trás desse crime tão hediondo!",
    "Até a nossa Força Policial tem dificuldade com os Rockets!",
  ],
  "cerulean-city:16,21": [
    "Se aquele Slowbro não estivesse ali, você poderia derrubar a árvore pequena com Cut.",
    "Assim, poderia chegar ao outro lado. Mas acho que existe um caminho alternativo.",
  ],
  "cerulean-city:9,23": [
    "Você está fazendo uma enciclopédia de Pokémon? Parece divertido.",
  ],
  "cerulean-city:32,29": ["Slowbro tirou uma soneca…"],
  "cerulean-city:33,29": ["Vamos, Slowbro, preste atenção!"],
  "cerulean-city:34,22": [
    "Você também é Treinador?",
    "Colecionar, batalhar… É uma vida dura, não é?",
  ],
  "cerulean-city:12,30": [
    "Quero uma bicicleta vermelha bem brilhante.",
    "Vou guardá-la em casa para não ficar suja.",
  ],
  "route-25:49,10": [
    "Este cabo é um famoso ponto de encontro de casais.",
    "A Misty, a Líder do Ginásio, tem grandes esperanças neste lugar.",
  ],
  "route-25:49,11": [
    "Olá, você está aqui sozinho?",
    "Se está no cabo de Cerulean… bem, deveria estar em casal.",
  ],
  "underground-path-south-entrance:5,6": [
    "As pessoas costumam perder coisas na escuridão do Underground Path.",
  ],
  "vermilion-city:22,11": [
    "Aqui somos cuidadosos com a poluição.",
    "Ouvimos dizer que Grimer se multiplica em lodo tóxico.",
  ],
  "vermilion-city:17,9": [
    "Você viu o S.S. Anne atracado no porto?",
  ],
  "vermilion-city:36,10": [
    "Estou construindo um prédio neste terreno. É tudo meu.",
    "Meu Pokémon está socando o chão para fazer a fundação.",
  ],
  "vermilion-city:35,11": [
    "Machop: Guoh! Gogogoh!",
  ],
  "vermilion-city:31,30": [
    "O S.S. Anne é um famoso cruzeiro de luxo.",
    "Ele visita Vermilion uma vez por ano.",
  ],
  "ss-anne-1f-corridor:18,8": [
    "Os passageiros estão inquietos nesta longa viagem.",
    "Você pode ser desafiado pelos mais entediados!",
  ],
  "ss-anne-1f-corridor:12,9": [
    "Bonjour! Eu sou o garçom deste navio!",
    "Terei o maior prazer em servir o que você quiser!",
    "… … … Ah! O tipo forte e silencioso!",
  ],
  "ss-anne-2f-corridor:2,7": [
    "Este navio é um transatlântico de luxo para Treinadores do mundo todo!",
    "Em cada porto, fazemos festas com Treinadores convidados.",
  ],
  "ss-anne-3f-corridor:10,4": [
    "Nosso Capitão é um mestre da espada. Ele é incrível usando Cut.",
    "Dizem que ele até ensina Cut aos Pokémon!",
  ],
  "ss-anne-deck:13,13": [
    "Ufa! Esfregar o convés é trabalho duro!",
  ],
  "ss-anne-deck:14,11": [
    "Urgh… Estou enjoado…",
    "Fiquei enjoado com o balanço do navio, então saí para tomar um ar…",
  ],
  "viridian-pokemon-center:12,5": [
    "Fique à vontade para usar aquele PC no canto.",
    "A recepcionista me disse que pode. Que gentil da parte dela!",
  ],
  "viridian-pokemon-center:4,7": [
    "Há um Pokémon Center em todas as cidades à frente.",
    "Eles não cobram nada, então não tenha vergonha de curar seus Pokémon.",
  ],
  "viridian-pokemon-center:2,3": [
    "Os Pokémon Centers curam Pokémon cansados, feridos ou desmaiados.",
    "Eles deixam todos os Pokémon completamente saudáveis.",
  ],
  "pewter-pokemon-center:4,8": [
    "O quê!? A Team Rocket está no Mt. Moon? Hã?",
    "Estou ao telefone! Cai fora!",
  ],
  "pewter-pokemon-center:1,2": [
    "Aaah!",
    "Quando Jigglypuff canta, os Pokémon ficam sonolentos…",
    "Eu também… Zzz…",
  ],
  "pewter-pokemon-center:10,7": [
    "Quero muito um Pikachu, então estou trocando meu Clefairy por um.",
  ],
  "pewter-pokemon-center:14,6": [
    "Estou trocando Pokémon com aquele garoto ali.",
    "Eu tinha dois Pikachu, então achei que podia trocar um.",
  ],
  "cerulean-pokemon-center:12,5": [
    "Você ouviu falar do Bill?",
    "Todo mundo o chama de Pokémaníaco! Acho que o pessoal só tem inveja do Bill.",
    "Quem não gostaria de se gabar dos próprios Pokémon?",
  ],
  "cerulean-pokemon-center:5,4": [
    "Aquele Bill!",
    "Ouvi dizer que ele faz de tudo para conseguir Pokémon raros. Dizem que ele não tem escrúpulos.",
  ],
  "cerulean-pokemon-center:4,8": [
    "O Bill tem muitos Pokémon! Ele coleciona os raros também!",
  ],
  "cerulean-pokemon-center:3,3": [
    "Por que você não sobe e tenta trocar Pokémon com seus amigos?",
    "Você pode conseguir muito mais variedade trocando. Os Pokémon recebidos em trocas também crescem rápido.",
  ],
  "route-4-pokemon-center:12,5": [
    "A Team Rocket ataca os cidadãos de Cerulean…",
    "Não passa um dia sem a Team Rocket aparecer no noticiário.",
  ],
  "route-4-pokemon-center:5,4": [
    "Certo, vou colocar seis Poké Balls no meu cinto…",
    "Pronto, assim está bom. No máximo, você pode ter seis Pokémon com você.",
  ],
  "route-4-pokemon-center:14,4": [
    "Às vezes você terá Pokémon demais para adicionar outro.",
    "Nesse caso, guarde alguns usando qualquer PC.",
  ],
  "vermilion-pokemon-center:4,8": [
    "Meu Pokémon foi envenenado! Ele desmaiou enquanto caminhávamos!",
  ],
  "vermilion-pokemon-center:12,5": [
    "Mesmo no mesmo nível, os Pokémon podem ter atributos e habilidades muito diferentes.",
    "Um Pokémon criado por um Treinador é mais forte que um selvagem.",
  ],
  "vermilion-pokemon-center:14,4": [
    "É verdade que um Pokémon de nível mais alto é mais poderoso…",
    "Mas todos os Pokémon têm pontos fracos contra certos tipos. Parece que não existe um Pokémon universalmente forte.",
  ],
  "viridian-mart:6,2": [
    "Preciso comprar Potions.",
    "Nunca se sabe quando seus Pokémon vão precisar de uma cura rápida.",
  ],
  "viridian-mart:9,5": [
    "Ouvi dizer que esta loja vende muito Antidote.",
  ],
  "pewter-mart:8,2": [
    "Um velho suspeito me convenceu a comprar este Pokémon peixe esquisito!",
    "Ele é fraquíssimo e custou ₽500!",
  ],
  "pewter-mart:6,4": [
    "Coisas boas podem acontecer se você criar seus Pokémon com dedicação.",
    "Até os fracos podem surpreender se você não desistir deles.",
  ],
  "cerulean-mart:9,2": [
    "Você conhece o Rare Candy? Ele não é vendido nas lojas.",
    "Acho que faz o Pokémon crescer muito rápido de repente.",
  ],
  "cerulean-mart:1,7": [
    "O Repel não só afasta insetos, como também funciona contra Pokémon fracos.",
    "Coloque seu Pokémon mais forte no começo da lista. Se o primeiro for forte, o efeito do Repel aumenta.",
  ],
  "vermilion-mart:4,2": [
    "Acho que os Pokémon podem ser bons ou maus. Depende do Treinador.",
  ],
  "vermilion-mart:9,4": [
    "Há pessoas perversas que usam Pokémon para cometer crimes.",
    "A Team Rocket trafica Pokémon raros, por exemplo. Eles também abandonam os Pokémon que consideram impopulares ou inúteis.",
    "É esse tipo de gente horrível que a Team Rocket é.",
  ],
  "mt-moon-1f:42,7": [
    "Olá, estou escavando fósseis aqui embaixo do Mt. Moon.",
    "Às vezes o Brock, do Pewter Gym, me dá uma mãozinha.",
  ],
};

export const WORLD_SIGN_TEXT: Readonly<
  Record<string, readonly string[]>
> = {
  "pallet-town:16,16": ["Laboratório de Pesquisa Pokémon do Prof. Oak"],
  "pallet-town:4,7": ["Sua casa"],
  "pallet-town:13,7": ["Casa do Blue"],
  "pallet-town:9,11": [
    "PALLET TOWN\nTons da sua jornada o aguardam!",
  ],
  "pallet-town:5,14": [
    "DICAS DE TREINADOR\nPressione START para abrir o MENU!",
  ],
  "route-1:9,31": ["ROUTE 1\nPALLET TOWN - VIRIDIAN CITY"],
  "viridian-city:23,1": [
    "DICAS DE TREINADOR\nCapture Pokémon e expanda sua coleção.",
    "Quanto mais Pokémon você tiver, mais fácil será batalhar.",
  ],
  "viridian-city:32,10": ["VIRIDIAN CITY\nPOKÉMON GYM"],
  "viridian-city:20,31": [
    "DICAS DE TREINADOR\nOs golpes dos Pokémon são limitados pelos Pontos de Poder, os PP.",
    "Para recuperar os PP, deixe seus Pokémon cansados descansarem em um Pokémon Center.",
  ],
  "viridian-city:20,16": [
    "VIRIDIAN CITY\nO Paraíso Eternamente Verde",
  ],
  "viridian-city:36,10": [
    "As portas do Viridian Gym estão trancadas…",
  ],
  "route-2:14,12": ["DIGLETT'S CAVE"],
  "route-2:7,73": ["ROUTE 2\nVIRIDIAN CITY - PEWTER CITY"],
  "viridian-forest:39,59": [
    "DICAS DE TREINADOR\nSe seus Pokémon estão fracos e você quer evitar batalhas, fique longe da grama alta!",
  ],
  "viridian-forest:43,26": [
    "DICAS DE TREINADOR\nContate o Prof. Oak por um PC para ter sua Pokédex avaliada!",
  ],
  "viridian-forest:9,29": [
    "DICAS DE TREINADOR\nVocê não pode capturar o Pokémon de outra pessoa.",
    "Jogue Poké Balls somente em Pokémon selvagens para capturá-los!",
  ],
  "viridian-forest:6,12": [
    "SAINDO DA VIRIDIAN FOREST\nPEWTER CITY À FRENTE",
  ],
  "viridian-forest:28,44": [
    "Para veneno, use ANTIDOTE! Compre nos Pokémon Marts!",
  ],
  "viridian-forest:31,60": [
    "DICAS DE TREINADOR\nEnfraqueça o Pokémon antes de tentar capturá-lo!",
    "Quando estão saudáveis, eles podem escapar!",
  ],
  "pewter-city:19,7": ["PEWTER MUSEUM OF SCIENCE"],
  "pewter-city:39,19": [
    "AVISO!\nLadrões têm roubado fósseis de Pokémon do Mt. Moon.",
    "Por favor, ligue para a Polícia de Pewter se tiver alguma informação.",
  ],
  "pewter-city:11,16": [
    "PEWTER CITY POKÉMON GYM\nLÍDER: BROCK\nO Treinador Pokémon Sólido como Rocha!",
  ],
  "pewter-city:20,30": [
    "DICAS DE TREINADOR\nTodos os Pokémon que aparecem em batalha, mesmo por pouco tempo, ganham pontos de EXP.",
  ],
  "pewter-city:31,25": ["PEWTER CITY\nUma Cidade Cinza como Pedra"],
  "pewter-gym:4,12": [
    "PEWTER POKÉMON GYM\nLÍDER: BROCK\nTREINADORES VENCEDORES: BLUE",
  ],
  "pewter-gym:8,12": [
    "PEWTER POKÉMON GYM\nLÍDER: BROCK\nTREINADORES VENCEDORES: BLUE",
  ],
  "route-3:72,11": ["ROUTE 3\nMT. MOON À FRENTE"],
  "route-4:18,7": ["MT. MOON\nEntrada do Túnel"],
  "route-4:34,7": ["ROUTE 4\nMT. MOON - CERULEAN CITY"],
  "mt-moon-1f:19,26": ["Cuidado! Zubat é um sugador de sangue!"],
  "cerulean-city:20,25": [
    "CERULEAN CITY\nUma Misteriosa Aura Azul o Envolve",
  ],
  "cerulean-city:27,21": [
    "CERULEAN CITY POKÉMON GYM\nLÍDER: MISTY\nA Sereia Moleca!",
  ],
  "cerulean-city:11,28": [
    "Grama e cavernas sem esforço! BIKE SHOP",
  ],
  "cerulean-city:19,32": [
    "DICAS DE TREINADOR\nUm Pokémon pode carregar um item.",
    "Alguns itens podem até ser usados em batalha pelo Pokémon que os carrega.",
  ],
  "cerulean-city:11,25": ["Uma bicicleta novinha em folha!"],
  "cerulean-city:11,26": ["Uma bicicleta novinha em folha!"],
  "cerulean-city:11,27": ["Uma bicicleta novinha em folha!"],
  "cerulean-gym:6,17": [
    "CERULEAN POKÉMON GYM\nLÍDER: MISTY\nTREINADORES VENCEDORES: BLUE",
  ],
  "cerulean-gym:10,17": [
    "CERULEAN POKÉMON GYM\nLÍDER: MISTY\nTREINADORES VENCEDORES: BLUE",
  ],
  "cerulean-house2:4,1": ["A Team Rocket deixou uma saída!"],
  "route-25:48,4": ["SEA COTTAGE\nO Bill mora aqui!"],
  "route-5:32,32": [
    "UNDERGROUND PATH\nCERULEAN CITY - VERMILION CITY",
  ],
  "route-6:21,15": [
    "UNDERGROUND PATH\nCERULEAN CITY - VERMILION CITY",
  ],
  "vermilion-city:33,6": [
    "VERMILION CITY\nO Porto dos Pores do Sol Esplêndidos",
  ],
  "vermilion-city:10,17": [
    "POKÉMON FAN CLUB\nTodos os fãs de Pokémon são bem-vindos!",
  ],
  "vermilion-city:10,24": [
    "VERMILION CITY POKÉMON GYM\nLÍDER: LT. SURGE\nO Americano Relâmpago!",
  ],
  "vermilion-city:34,18": ["VERMILION HARBOR"],
  "vermilion-city:45,17": [
    "AVISO!\nA ROUTE 12 pode estar bloqueada por um Pokémon dormindo.",
    "Faça um desvio pelo ROCK TUNNEL até LAVENDER TOWN.\nPOLÍCIA DE VERMILION",
  ],
  "vermilion-gym:3,17": [
    "VERMILION POKÉMON GYM\nLÍDER: LT. SURGE\nTREINADORES VENCEDORES: BLUE",
  ],
  "vermilion-gym:7,17": [
    "VERMILION POKÉMON GYM\nLÍDER: LT. SURGE\nTREINADORES VENCEDORES: BLUE",
  ],
  "ss-anne-captains-office:2,3": [
    "Como Vencer o Enjoo\nO Capitão está lendo isto!",
  ],
  "ss-anne-captains-office:2,4": [
    "Como Vencer o Enjoo\nO Capitão está lendo isto!",
  ],
  "ss-anne-captains-office:5,3": ["Eca! Não devia ter olhado!"],
  "route-22:7,12": ["POKÉMON LEAGUE\nPortão Principal"],
};

export function resolveWorldNpcPages(
  mapId: string,
  x: number,
  y: number,
): readonly string[] | null {
  return WORLD_NPC_TEXT[`${mapId}:${x},${y}`] ?? null;
}

export function resolveWorldSignPages(
  mapId: string,
  x: number,
  y: number,
): readonly string[] | null {
  return WORLD_SIGN_TEXT[`${mapId}:${x},${y}`] ?? null;
}
