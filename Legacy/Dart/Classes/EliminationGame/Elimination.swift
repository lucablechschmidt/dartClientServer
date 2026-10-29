//
//  Elimination.swift
//  Dart
//
//  Created by Luca Blechschmidt on 30.01.25.
//

import Foundation

class Elimination {
    var dart: SingleDartsScore
    var elimination: Dictionary<UUID, Int> = [:]
    
    
    init(dart: SingleDartsScore) {
        self.dart = dart
    }
    
    func dartHasEliminated() -> Bool {
        return elimination.count > 0
    }
    
    func addElimination(player: Player, points: Int) {
        elimination.updateValue(points, forKey: player.playerId)
    }
    
    func removeElimination(player: Player) -> Int{
        return elimination.removeValue(forKey: player.playerId) ?? 0
    }
}

