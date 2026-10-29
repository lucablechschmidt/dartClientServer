//
//  GameType.swift
//  Dart
//
//  Created by Luca Blechschmidt on 25.01.25.
//

import Foundation

enum GameTypeIn: CaseIterable, Hashable {
    case SingleIn
    case DoubleIn
    case TripleIn
}

enum GameTypeOut: CaseIterable, Hashable {
    case SingleOut
    case DoubleOut
    case TripleOut
}

class GameType {
    let inConstriction: GameTypeIn
    let outConstriction: GameTypeOut
    
    init(inConstriction: GameTypeIn = GameTypeIn.SingleIn, outConstriction: GameTypeOut = GameTypeOut.DoubleOut) {
        self.inConstriction = inConstriction
        self.outConstriction = outConstriction
    }
}

func createDummyGameType() -> GameType {
    return GameType(inConstriction: GameTypeIn.SingleIn, outConstriction: GameTypeOut.DoubleOut)
}
