//
//  Player.swift
//  Dart
//
//  Created by Luca Blechschmidt on 25.01.25.
//

import Foundation
import OrderedCollections
import SwiftData

@Model
final class Player: Hashable {
    @Attribute(.unique)
    var playerId: UUID = UUID()
    var timestamp: Date = Date()
    var name: String
    
    init(name: String) {
        self.name = name
    }
    
    static func == (lhs: Player, rhs: Player) -> Bool {
            ObjectIdentifier(lhs) == ObjectIdentifier(rhs)
    }

    func hash(into hasher: inout Hasher) {
        hasher.combine(ObjectIdentifier(self))
    }
}

func createDummyPlayer() -> Player {
    return Player(name: "Dummy")
}

func createDummyPlayer(_ name: String) -> Player {
    return Player(name: name)
}

func createDummyPlayers(playersNumber: Int) -> [Player] {
    var players: [Player] = []
    for i in 0..<playersNumber {
        players.append(createDummyPlayer("Player \(i)"))
    }
    //players.append(createDummyPlayer("Moschusochse"))
    //players.append(createDummyPlayer("Haflinger"))
    //players.append(createDummyPlayer("Wombat"))
    
    return players
}

func createDummyPlayerSet() -> OrderedSet<Player> {
    var players: OrderedSet<Player> = []
    players.insert(createDummyPlayer("Moschusochse"), at: 0)
    players.insert(createDummyPlayer("Haflinger"), at: 1)
    return players
}

class PlayerToOrdered {
    let player: Player
    let position: Int
    
    init(player: Player, position: Int) {
        self.player = player
        self.position = position
    }
}
