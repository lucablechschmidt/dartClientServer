//
//  DartThrow.swift
//  Dart
//
//  Created by Luca Blechschmidt on 25.01.25.
//

import Foundation

class DartThrow {
    let throwId: UUID = UUID()
    
    var darts: FixedSizeArray<SingleDartsScore>
    var dartThrowScore: Int
    
    var faulty: Bool = false;
    
    init() {
        self.darts = FixedSizeArray<SingleDartsScore>(maxSize: 3, defaultValue: SingleDartsScore(field: 0, scoreType: .unset))
        self.dartThrowScore = getDartThrowScore(darts: darts)
    }
    
    func addSingleDartScore(score: SingleDartsScore) {
        darts.append(score)
        dartThrowScore = getDartThrowScore(darts: darts)
    }
    
    func addSingleFaultyDartScore() {
        darts.append(SingleDartsScore(field: 0, scoreType: .overthrown))
    }
    
    func addFaultyDartScore() {
        for _ in darts.count...darts.getMaxSize() - 1 {
            darts.append(SingleDartsScore(field: 0, scoreType: .overthrown))
        }
        faulty = true
    }
    
    func removeLastDartThrow() -> SingleDartsScore? {
        if faulty {
            var dart: SingleDartsScore?
            for _ in 0...darts.count - 1 {
                if darts.returnLastElement()!.scoreType == ScoreType.overthrown {
                    dart = darts.removeLast()
                } else {
                    break
                }
            }
            self.faulty = false
            return dart
        }
        return darts.removeLast()
    }
    
    func scoreToString(dart: SingleDartsScore) -> String {
        var str = dart.scoreType == ScoreType.double ? "D" : ""
        str += dart.scoreType == ScoreType.triple ? "T" : ""
        return str + dart.fieldName.title
    }
    
    func getCurrentDartThrow() -> SingleDartsScore {
        return darts.returnLastElement()!
    }
    
    func getDartsThrown() -> Int {
        return darts.count
    }
}

func getDartThrowScore(darts: FixedSizeArray<SingleDartsScore>) -> Int {
    var points: Int = 0
    for i in 0..<darts.count {
        points += darts[i].totalScoreOfDart
    }
    return points
}

func getScoreMultiplier(scoreType: ScoreType) -> Int {
    switch scoreType {
        case ScoreType.normal: return 1
        case ScoreType.double: return 2
        case ScoreType.triple: return 3
        default: return 0
    }
}
