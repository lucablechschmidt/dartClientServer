//
//  Leg.swift
//  Dart
//
//  Created by Luca Blechschmidt on 25.01.25.
//

import Foundation

class Leg {
    let legId: UUID = UUID()
    
    let scoreToWinLeg: Int
    
    var dartThrows: Dictionary<UUID, [DartThrow]>
    var playerScores: Dictionary<UUID, Int>
    
    private var winningPlayer: Player?
    
    init(scoreToWinLeg: Int, players: [Player]) {
        self.scoreToWinLeg = scoreToWinLeg
        
        var dartThrows: Dictionary<UUID, [DartThrow]> = [:]
        var playerScores: Dictionary<UUID, Int> = [:]
        
        for player in players {
            dartThrows.updateValue([], forKey: player.playerId)
            playerScores.updateValue(scoreToWinLeg, forKey: player.playerId)
        }
        
        self.dartThrows = dartThrows
        self.playerScores = playerScores
    }
    
    func getAverage(leg: Leg, playerId: UUID) -> Double {
        var points: Int = 0
        if leg.playerScores[playerId] == nil {
            return 0.0
        }
        
        let dartThrows = leg.dartThrows[playerId]!
        
        for i in 0..<dartThrows.count - 1 {
            points+=dartThrows[i].dartThrowScore
        }
        
        return Double(points/dartThrows.count)
    }
    
    func setWinningPlayer(player: Player) {
        self.winningPlayer = player
    }
}

func createNewLegInGame(leg: Leg) -> Leg {
    let players = leg.dartThrows.keys
    players.forEach { player in
        leg.dartThrows.updateValue([], forKey: player)
        leg.playerScores.updateValue(leg.scoreToWinLeg, forKey: player)
    }
    
    return leg
}
