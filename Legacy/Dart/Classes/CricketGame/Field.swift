//
//  CricketFieldPlayerHits.swift
//  Dart
//
//  Created by Luca Blechschmidt on 27.01.25.
//

import Foundation

class Field {
    let field: CricketFields
    var isClosed: Bool = false
    var playersFieldHits: Dictionary<UUID, [SingleDartsScore]> = [:]
    
    let players: [Player]
    
    init(players: [Player], cricketField: CricketFields) {
        self.players = players
        self.field = cricketField
        
        for player in players {
            self.playersFieldHits.updateValue( [], forKey: player.playerId)
        }
    }
    
    func updateFieldStatus() -> Bool {
        for player in players {
            if playersFieldHits[player.playerId]!.count < 3 {
                self.isClosed = false
                return false
            }
        }
        self.isClosed = true
        return true
    }
    
    func addPlayerDartsScore(playerId: UUID, score: SingleDartsScore) -> Int {
        let playerFieldHitsCount = self.playersFieldHits[playerId]?.count ?? 0
        let dartFieldHitCounts = score.getMultiplier()
        
        for _ in 0..<dartFieldHitCounts {
            let dartForField = SingleDartsScore(field: score.field, scoreType: ScoreType.normal)
            self.playersFieldHits[playerId]?.append(dartForField)
        }
        
        if self.updateFieldStatus() {
            return 0
        }
        
        if playerFieldHitsCount > 3 {
            return score.totalScoreOfDart
        } else if playerFieldHitsCount + dartFieldHitCounts > 3 {
            let multiplier: Int = dartFieldHitCounts + playerFieldHitsCount - 3
            return score.field * multiplier
        }
        
        return 0
    }
    
    func removePlayerDartScore(playerId: UUID, score: SingleDartsScore) -> Int {
        let playerFieldHitsCount = self.playersFieldHits[playerId]?.count ?? 0
        let dartFieldHitCounts = score.getMultiplier()
        
        for _ in 0..<dartFieldHitCounts {
            self.playersFieldHits[playerId]?.removeLast()
        }
        
        if self.updateFieldStatus() {
            return 0
        }
        
        if playerFieldHitsCount - dartFieldHitCounts >= 3 {
            return score.totalScoreOfDart
        }
        
        return 0
    }
}
