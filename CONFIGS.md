TODO: проверить конфиг:
{
  "pawnCount": {
    "id": "pawnCount",
    "weight": 5,
    "params": {
      "pawnValue": 1
    }
  },
  "pawnAdvancement": {
    "id": "pawnAdvancement",
    "weight": 2,
    "params": {
      "nearPromotionBonus": 2000,
      "almostNearPromotionBonus": 50,
      "enemySideBonus": 10,
      "rankDistanceBonus": 10
    }
  },
  "mediumPawnAdvancement": {
    "id": "mediumPawnAdvancement",
    "weight": 0.5,
    "params": {}
  },
  "mediumCenterColumnBonus": {
    "id": "mediumCenterColumnBonus",
    "weight": 0.1,
    "params": {}
  },
  "mediumNextMoveSafety": {
    "id": "mediumNextMoveSafety",
    "weight": 10,
    "params": {}
  },
  "mediumFreePath": {
    "id": "mediumFreePath",
    "weight": 1,
    "params": {}
  },
  "mediumAdjacentThreat": {
    "id": "mediumAdjacentThreat",
    "weight": -1,
    "params": {}
  },
  "pawnAdvancementAdvanced": {
    "id": "pawnAdvancementAdvanced",
    "weight": 0.5,
    "params": {
      "baseScore": 50,
      "rankMultiplier": 1,
      "nearGoalBonus": 0,
      "veryNearGoalBonus": 200
    }
  },
  "passedPawns": {
    "id": "passedPawns",
    "weight": 1.5,
    "params": {
      "passedPawnBaseBonus": 150,
      "passedPawnRankMultiplier": 100,
      "nearGoalPassedBonus": 500
    }
  },
  "passedPawnsPhaseAdaptive": {
    "id": "passedPawnsPhaseAdaptive",
    "weight": 2,
    "params": {
      "passedPawnBaseBonus": 250,
      "passedPawnRankMultiplier": 100,
      "nearGoalPassedBonus": 50,
      "enablePhaseAdjustment": 1,
      "endgameMultiplier": 10,
      "middlegameMultiplier": 10,
      "endgameThreshold": 15,
      "middlegameThreshold": 5
    }
  },
  "blockedPawns": {
    "id": "blockedPawns",
    "weight": -1,
    "params": {
      "blockedPenalty": 0
    }
  },
  "opponentBlockedPawns": {
    "id": "opponentBlockedPawns",
    "weight": 1,
    "params": {
      "opponentBlockedBonus": 75
    }
  },
  "mobility": {
    "id": "mobility",
    "weight": 0,
    "params": {}
  },
  "opponentRestriction": {
    "id": "opponentRestriction",
    "weight": 1.5,
    "params": {
      "attackedSquareBonus": 0,
      "attackedNearOpponentBonus": 2
    }
  },
  "connectedPawns": {
    "id": "connectedPawns",
    "weight": 15,
    "params": {
      "connectedPawnBonus": 0
    }
  },
  "openingTempo": {
    "id": "openingTempo",
    "weight": 1,
    "params": {
      "doubleMoveBonus": 2,
      "centerDoubleMoveBonus": 0.5,
      "maxEffectiveMoveNumber": 15
    }
  },
  "threatenedPawns": {
    "id": "threatenedPawns",
    "weight": 1,
    "params": {
      "threatenedPenalty": 30,
      "threatenedAdvancedPenalty": 100
    }
  },
  "potentialCaptures": {
    "id": "potentialCaptures",
    "weight": 20,
    "params": {
      "captureBaseValue": 10,
      "captureRankMultiplier": 0
    }
  },
  "pawnIslands": {
    "id": "pawnIslands",
    "weight": 1,
    "params": {
      "islandPenalty": 5
    }
  },
  "isolatedPawns": {
    "id": "isolatedPawns",
    "weight": -2,
    "params": {
      "isolatedPawnPenalty": 30,
      "isolatedAdvancedPenalty": 5
    }
  },
  "keySquareControl": {
    "id": "keySquareControl",
    "weight": 5,
    "params": {
      "controlOpponentFrontBonus": 0,
      "controlPromotionApproachBonus": 7.5
    }
  },
  "promotionRace": {
    "id": "promotionRace",
    "weight": 2,
    "params": {
      "raceWinBonus": 1000,
      "raceAdvantageMultiplier": 30
    }
  },
  "pawnMajority": {
    "id": "pawnMajority",
    "weight": 20,
    "params": {
      "majorityBonus": 100,
      "centerWeight": 0.75
    }
  }
}




TODO: New Best config:

[2025-04-24T19:05:05.331Z] Candidate Config: {"pawnCount":{"id":"pawnCount","weight":1,"params":{"pawnValue":100}},"pawnAdvancement":{"id":"pawnAdvancement","weight":1,"params":{"nearPromotionBonus":100,"almostNearPromotionBonus":500,"enemySideBonus":30,"rankDistanceBonus":5}},"mediumPawnAdvancement":{"id":"mediumPawnAdvancement","weight":0.5,"params":{}},"mediumCenterColumnBonus":{"id":"mediumCenterColumnBonus","weight":10,"params":{}},"mediumNextMoveSafety":{"id":"mediumNextMoveSafety","weight":20,"params":{}},"mediumFreePath":{"id":"mediumFreePath","weight":0.2,"params":{}},"mediumAdjacentThreat":{"id":"mediumAdjacentThreat","weight":-0.5,"params":{}},"pawnAdvancementAdvanced":{"id":"pawnAdvancementAdvanced","weight":2,"params":{"baseScore":20,"rankMultiplier":2,"nearGoalBonus":20,"veryNearGoalBonus":100}},"passedPawns":{"id":"passedPawns","weight":5,"params":{"passedPawnBaseBonus":50,"passedPawnRankMultiplier":20,"nearGoalPassedBonus":500}},"passedPawnsPhaseAdaptive":{"id":"passedPawnsPhaseAdaptive","weight":0.5,"params":{"passedPawnBaseBonus":500,"passedPawnRankMultiplier":100,"nearGoalPassedBonus":50,"enablePhaseAdjustment":0,"endgameMultiplier":5,"middlegameMultiplier":0.5,"endgameThreshold":5,"middlegameThreshold":1}},"blockedPawns":{"id":"blockedPawns","weight":1,"params":{"blockedPenalty":100}},"opponentBlockedPawns":{"id":"opponentBlockedPawns","weight":5,"params":{"opponentBlockedBonus":100}},"mobility":{"id":"mobility","weight":2,"params":{}},"opponentRestriction":{"id":"opponentRestriction","weight":15,"params":{"attackedSquareBonus":20,"attackedNearOpponentBonus":0.5}},"connectedPawns":{"id":"connectedPawns","weight":5,"params":{"connectedPawnBonus":10}},"openingTempo":{"id":"openingTempo","weight":1,"params":{"doubleMoveBonus":20,"centerDoubleMoveBonus":0.5,"maxEffectiveMoveNumber":1.5}},"threatenedPawns":{"id":"threatenedPawns","weight":-1,"params":{"threatenedPenalty":75,"threatenedAdvancedPenalty":0}},"potentialCaptures":{"id":"potentialCaptures","weight":2,"params":{"captureBaseValue":150,"captureRankMultiplier":30}},"pawnIslands":{"id":"pawnIslands","weight":-5,"params":{"islandPenalty":0}},"isolatedPawns":{"id":"isolatedPawns","weight":-1.5,"params":{"isolatedPawnPenalty":30,"isolatedAdvancedPenalty":5}},"keySquareControl":{"id":"keySquareControl","weight":1,"params":{"controlOpponentFrontBonus":2,"controlPromotionApproachBonus":0}},"promotionRace":{"id":"promotionRace","weight":10,"params":{"raceWinBonus":20,"raceAdvantageMultiplier":5}},"pawnMajority":{"id":"pawnMajority","weight":10,"params":{"majorityBonus":10,"centerWeight":0.2}}}

