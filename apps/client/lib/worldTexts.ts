/**
 * FireRed NPC and sign texts (pt-BR) keyed by `mapId:x,y` (ROM event
 * coordinates). Only objects listed in `WORLD_NPC_TEXT` are rendered from
 * the map's `world.json`; every other ROM object is either hand-authored
 * elsewhere (trainers, clerks, nurses, story NPCs) or deferred.
 */

import {
  GENERATED_NPC_TEXT,
  GENERATED_SIGN_TEXT,
} from "./generated/worldTexts";

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
    "Hoooaaam!",
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
  "viridian-house:7,4": [
    "Inventar apelidos é divertido, mas não é tão fácil.",
    "Apelidos inteligentes são legais, mas os simples são mais fáceis de lembrar.",
  ],
  "viridian-house:2,5": [
    "Meu pai também adora Pokémon.",
  ],
  "viridian-house:6,6": [
    "Speary: Tetweet!",
  ],
  "viridian-school:6,2": [
    "Certo!",
    "Leia com atenção o que está no quadro-negro!",
  ],
  "viridian-school:4,5": [
    "Ufa! Estou tentando memorizar todas as minhas anotações.",
  ],
  "pewter-museum-1f:2,4": [
    "Devo ser grato por minha longa vida.",
    "Nunca pensei que veria os ossos de um dragão!",
  ],
  "pewter-museum-1f:26,4": [
    "Temos dois fósseis de Pokémon pré-históricos raros em exposição.",
  ],
  "pewter-museum-2f:10,5": [
    "Neste mês, estamos com uma exposição sobre o espaço.",
  ],
  "pewter-museum-2f:4,9": [
    "Moon Stone, é? O que tem de especial? Parece uma pedra comum para mim.",
  ],
  "pewter-museum-2f:0,6": [
    "20 de julho de 1969!",
    "Foi o dia em que a humanidade pisou na Lua pela primeira vez.",
    "Comprei uma TV colorida só para assistir à notícia.",
  ],
  "pewter-museum-2f:15,8": [
    "Eu quero um Pikachu! É tão fofo!",
    "Pedi para o meu pai capturar um para mim!",
  ],
  "pewter-museum-2f:16,8": [
    "Sim, um Pikachu em breve, eu prometo!",
  ],
  "pewter-house-1:1,2": [
    "Nosso Pokémon é um forasteiro, então é birrento e difícil de controlar.",
    "Forasteiro é o Pokémon que você recebe em uma troca.",
    "Ele cresce rápido, mas pode ignorar um Treinador inexperiente em batalha.",
    "Se ao menos tivéssemos algumas Badges…",
  ],
  "pewter-house-1:5,3": [
    "Nidoran, senta!",
  ],
  "pewter-house-1:6,3": [
    "Nidoran?: Bowbow!",
  ],
  "pewter-house-2:3,3": [
    "Os Pokémon aprendem novas técnicas conforme crescem.",
    "Mas alguns golpes precisam ser ensinados por pessoas.",
  ],
  "pewter-house-2:5,3": [
    "Um Pokémon fica mais fácil de capturar se tiver um problema de status.",
    "Sono, veneno, queimadura ou paralisia… Todos funcionam bem.",
    "Mas capturar Pokémon nunca é garantido!",
  ],
  "cerulean-house-1:6,5": [
    "Só Treinadores habilidosos conseguem coletar Badges Pokémon.",
    "Vejo que você tem pelo menos uma.",
    "Essas Badges têm segredos incríveis, sabia?",
  ],
  "cerulean-house-3:7,5": [
    "Meu marido gosta de trocar Pokémon.",
    "Você está coletando Pokémon para a sua Pokédex, não está?",
    "Poderia trocar com ele, por favor?",
  ],
  "cerulean-bike-shop:9,7": [
    "Essas bicicletas são legais, mas custam uma fortuna!",
  ],
  "cerulean-bike-shop:5,5": [
    "Uma bicicleta urbana comum já está bom para mim.",
    "Afinal, você não consegue colocar uma cesta de compras em uma mountain bike.",
  ],
  "cerulean-house-4:5,3": [
    "Suspiro… Tempo demais, coisa de menos para fazer…",
    "Não está acontecendo nada divertido em lugar nenhum?",
  ],
  "vermilion-pokemon-fan-club:6,4": [
    "Nosso Presidente é muito fã de Pokémon.",
  ],
  "vermilion-pokemon-fan-club:7,6": [
    "Pikachu: Chu! Pikachu!",
  ],
  "vermilion-pokemon-fan-club:4,6": [
    "Seel: Kyuoo!",
  ],
  "vermilion-pokemon-fan-club:4,5": [
    "Eu adoro o meu Seel! Ele é tão amoroso!",
    "Ele chia “Kyuuuh” quando eu o abraço!",
  ],
  "vermilion-pokemon-fan-club:7,5": [
    "Não quer admirar a adorável cauda do meu Pikachu?",
  ],
  "vermilion-house-3:7,4": [
    "Estou fazendo meu Pidgey levar uma carta voando até Saffron, ao norte.",
  ],
  "vermilion-house-3:2,5": [
    "Pidgey: Kurukkoo!",
  ],
  "vermilion-house-3:2,4": [
    "Quero trocar cartas com todo tipo de gente.",
    "Mando meu Pidgey a uma Union Room para trocar as cartas por mim.",
  ],
  "route-2-house:4,5": [
    "Um Pokémon desmaiado não tem mais energia para batalhar.",
    "Mas ele ainda pode usar golpes como Cut fora de batalha.",
  ],
  "ss-anne-kitchen:1,5": [
    "Você, mon petit! Estamos ocupados aqui!",
    "Saia da frente!",
  ],
  "ss-anne-kitchen:6,6": [
    "Vi uma Berry estranha no lixo. O que será que era?",
  ],
  "ss-anne-kitchen:10,4": [
    "Estou tão ocupado que estou ficando tonto! Dê-me espaço aqui!",
  ],
  "ss-anne-kitchen:14,5": [
    "Hum-de-hum-de-ho…",
    "Descasco batatas todos os dias! Hum-hum…",
  ],
  "ss-anne-kitchen:14,7": [
    "Você ouviu falar do Snorlax? Ele é um glutão.",
    "Nenhum outro Pokémon come e dorme como o Snorlax!",
  ],
  "ss-anne-kitchen:14,9": [
    "Snif… Fungada…",
    "Eu só descasco cebolas… Snif…",
  ],
  "ss-anne-1f-room-1:2,5": [
    "Psiu…! Sou um agente da Polícia Global.",
    "Estou no rastro da Team Rocket. Eles não estão tramando nada de bom!",
  ],
  "ss-anne-1f-room-2:2,6": [
    "Estamos dando a volta ao mundo, eu e meus filhos.",
  ],
  "ss-anne-1f-room-3:3,4": [
    "Eu sempre viajo com Wigglytuff. Nunca saio de casa sem ele.",
  ],
  "ss-anne-1f-room-3:4,2": [
    "Wigglytuff: Puup pupuu!",
  ],
  "ss-anne-1f-room-3:0,4": [
    "Uma viagem ao redor do mundo é tão elegante e aconchegante!",
  ],
  "ss-anne-1f-room-4:2,4": [
    "Garçom, eu gostaria de uma torta de cereja, por favor!",
  ],
  "ss-anne-2f-room-3:2,5": [
    "Ah, sim, já vi Pokémon levando pessoas pela água!",
  ],
  "ss-anne-2f-room-3:3,2": [
    "Árvores pequenas podem ser derrubadas com o golpe Cut.",
    "Mas lembre-se! Cut é uma técnica HM.",
    "Depois de aprendida, não é fácil de esquecer.",
  ],
  "ss-anne-2f-room-5:5,2": [
    "Você já foi à Safari Zone de Fuchsia City?",
    "Há muitos tipos de Pokémon raros lá.",
  ],
  "ss-anne-2f-room-5:3,5": [
    "Eu e meu pai achamos a Safari Zone incrível!",
    "Queria que pudéssemos ir lá de novo.",
  ],
  "ss-anne-2f-room-6:1,4": [
    "Ouvi dizer que muita gente fica enjoada no mar.",
  ],
  "ss-anne-2f-room-6:4,4": [
    "O Capitão disse que está muito enjoado. Estava todo pálido.",
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
  "pallet-players-house-1f:6,1": [
    "Ops, lado errado…",
  ],
  "pallet-players-house-2f:6,5": [
    "Você jogou no NES.",
    "…Certo! Hora de ir!",
  ],
  "pallet-players-house-2f:1,1": [
    "Você ligou o PC.",
  ],
  "pallet-players-house-2f:11,1": [
    "É um aviso afixado…",
    "Se estiver confuso, peça AJUDA! Pressione o botão L ou R!",
  ],
  "pallet-rivals-house:12,1": [
    "As estantes estão lotadas de livros sobre Pokémon.",
  ],
  "pallet-rivals-house:11,1": [
    "As estantes estão lotadas de livros sobre Pokémon.",
  ],
  "pallet-rivals-house:9,1": [
    "“O lindo e doce Clefairy”",
  ],
  "viridian-house:7,1": [
    "SPEAROW\nNome: SPEARY",
  ],
  "viridian-school:4,4": [
    "Vamos ver o caderno.",
    "Primeira página…",
    "As Poké Balls são usadas para capturar Pokémon.",
    "Até seis Pokémon podem ser carregados no time.",
    "Pessoas que criam e batalham com Pokémon são chamadas de Treinadores.",
  ],
  "viridian-school:5,1": [
    "O quadro-negro lista os problemas de STATUS dos Pokémon em batalha.",
  ],
  "viridian-school:4,1": [
    "O quadro-negro lista os problemas de STATUS dos Pokémon em batalha.",
  ],
  "pewter-museum-1f:4,4": [
    "Fóssil de AERODACTYL\nUm Pokémon primitivo e raro.",
  ],
  "pewter-museum-1f:4,7": [
    "Fóssil de KABUTOPS\nUm Pokémon primitivo e raro.",
  ],
  "pewter-museum-2f:3,6": [
    "Um meteorito que caiu no Mt. Moon. Acredita-se que seja uma Moon Stone.",
  ],
  "pewter-museum-2f:3,5": [
    "Um meteorito que caiu no Mt. Moon. Acredita-se que seja uma Moon Stone.",
  ],
  "cerulean-house-5:3,1": [
    "“POKÉMON JUMP”",
    "Faça seu Pokémon pular a corda de Vine Whip com o botão A.",
    "Só Pokémon pequenos, de cerca de 70 cm ou menos, podem participar.",
    "Pokémon que só nadam, escavam ou voam não são bons em pular.",
    "Coisas boas acontecem se todos pularem no mesmo ritmo.",
  ],
  "vermilion-pokemon-fan-club:2,1": [
    "Vamos ouvir os outros Treinadores com educação!",
  ],
  "vermilion-pokemon-fan-club:9,1": [
    "Se alguém se gabar, gabe-se de volta!",
  ],
  "vermilion-house-3:6,4": [
    "Querida Pippi, espero ver você em breve.",
    "Ouvi dizer que Saffron tem problemas com a Team Rocket. Vermilion parece estar segura.",
  ],
  "cerulean-bike-shop:4,3": [
    "Uma bicicleta novinha em folha!",
  ],
  "cerulean-bike-shop:4,4": [
    "Uma bicicleta novinha em folha!",
  ],
  "cerulean-bike-shop:4,5": [
    "Uma bicicleta novinha em folha!",
  ],
  "cerulean-bike-shop:2,3": [
    "Uma bicicleta novinha em folha!",
  ],
  "cerulean-bike-shop:1,4": [
    "Uma bicicleta novinha em folha!",
  ],
  "cerulean-bike-shop:2,5": [
    "Uma bicicleta novinha em folha!",
  ],
  "cerulean-bike-shop:2,7": [
    "Uma bicicleta novinha em folha!",
  ],
  "cerulean-bike-shop:2,8": [
    "Uma bicicleta novinha em folha!",
  ],
  "pewter-museum-2f:15,5": [
    "Ônibus Espacial",
  ],
  "pewter-museum-2f:14,5": [
    "Ônibus Espacial",
  ],
  "pewter-museum-2f:16,5": [
    "Ônibus Espacial",
  ],
  "pewter-museum-2f:14,4": [
    "Ônibus Espacial",
  ],
  "pewter-museum-2f:15,4": [
    "Ônibus Espacial",
  ],
  "pewter-museum-2f:16,4": [
    "Ônibus Espacial",
  ],
};

export function resolveWorldNpcPages(
  mapId: string,
  x: number,
  y: number,
): readonly string[] | null {
  const key = `${mapId}:${x},${y}`;
  return WORLD_NPC_TEXT[key] ?? GENERATED_NPC_TEXT[key] ?? null;
}

export function resolveWorldSignPages(
  mapId: string,
  x: number,
  y: number,
): readonly string[] | null {
  const key = `${mapId}:${x},${y}`;
  return WORLD_SIGN_TEXT[key] ?? GENERATED_SIGN_TEXT[key] ?? null;
}
