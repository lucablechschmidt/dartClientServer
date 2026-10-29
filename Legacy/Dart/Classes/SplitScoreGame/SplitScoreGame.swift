//
//  SplitScoreGame.swift
//  Dart
//
//  Created by Luca Blechschmidt on 29.01.25.
//

import Foundation
import OrderedCollections

enum SplitScoreFields: CaseIterable, Hashable {
    case zero, fifteen, sixteen, double, seventeen, eighteen, triple, nineteen, twenty, bull, done
    
    var title: String{
        switch self{
            case .zero: return "0"
            case .fifteen: return "15"
            case .sixteen: return "16"
            case .double: return "Double"
            case .seventeen: return "17"
            case .eighteen: return "18"
            case .triple: return "Triple"
            case .nineteen: return "19"
            case .twenty: return "20"
            case .bull: return "Bull"
            default: return ""
        }
    }
}

class SplitScoreGame: Game {
    let fieldToHit: OrderedSet<SplitScoreFields> = [SplitScoreFields.fifteen, SplitScoreFields.sixteen, SplitScoreFields.double, SplitScoreFields.seventeen, SplitScoreFields.eighteen, SplitScoreFields.triple, SplitScoreFields.nineteen, SplitScoreFields.twenty, SplitScoreFields.bull, SplitScoreFields.done]
    
    var currentFieldToHit: SplitScoreFields
    
    init(players: [Player]) {
        self.currentFieldToHit = SplitScoreFields.fifteen
        
        super.init(players: players, points: 40)
    }
    
    func restart() {
        self.dartThrows = [:]
        self.playerScores = [:]
        
        for player in players {
            dartThrows.updateValue([], forKey: player.playerId)
            playerScores.updateValue(40, forKey: player.playerId)
        }
        
        self.currentFieldToHit = SplitScoreFields.fifteen
    }
    
    override func switchPlayers() {
        let playerScore = playerScores[currentPlayer.playerId]!
        var playerDartThrows: [DartThrow] = dartThrows[currentPlayer.playerId] ?? []
        playerDartThrows.append(currentDartThrow)
        
        dartThrows.updateValue(playerDartThrows, forKey: currentPlayer.playerId)
        if hasDartThrowHitFieldToHit(currentDartThrow) {
            playerScores.updateValue(playerScore + getDartScore(currentDartThrow), forKey: currentPlayer.playerId)
        } else {
            playerScores.updateValue((playerScore+1)/2, forKey: currentPlayer.playerId)
        }
        
        currentDartThrow = DartThrow()
        let index = players.firstIndex(of: currentPlayer)
        if index == players.count - 1 {
            currentPlayer = players.first!
            let index = fieldToHit.firstIndex(of: currentFieldToHit)!
            currentFieldToHit = fieldToHit[index + 1]
            if currentFieldToHit == SplitScoreFields.done {
                gameHasEnded = true
            }
        } else {
            currentPlayer = players[index! + 1]
        }
    }
    
    func hasDartThrowHitFieldToHit(_ dartThrow: DartThrow) -> Bool {
        var hasHit: Bool = false
        for i in 0..<dartThrow.darts.count {
            if dartThrow.darts[i].fieldName.title == currentFieldToHit.title {
                return true
            }else if currentFieldToHit == SplitScoreFields.double {
                hasHit = dartThrow.darts[i].scoreType == ScoreType.double
            }else if currentFieldToHit == SplitScoreFields.triple {
                hasHit = dartThrow.darts[i].scoreType == ScoreType.triple
            }
            if hasHit {
                return true
            }
        }
        return false
    }
    
    func getDartScore(_ dartThrow: DartThrow) -> Int {
        var score: Int = 0
        for i in 0..<dartThrow.darts.count {
            score += dartThrow.darts[i].totalScoreOfDart
        }
        return score
    }
    
    func dartHasHitCurrentField(_ dart: SingleDartsScore) -> Bool {
        if currentFieldToHit == SplitScoreFields.double {
            return dart.scoreType == ScoreType.double
        }else if currentFieldToHit == SplitScoreFields.triple {
            return dart.scoreType == ScoreType.triple
        }else {
            return dart.fieldName.title == currentFieldToHit.title
        }
    }
    
    override func addDartThrow(score: SingleDartsScore) {
        let isCurrentField = dartHasHitCurrentField(score)
        if currentDartThrow.darts.count < 2 {
            if isCurrentField {
                currentDartThrow.addSingleDartScore(score: score)
            }else {
                currentDartThrow.addSingleFaultyDartScore()
            }
        } else {
            if isCurrentField {
                currentDartThrow.addSingleDartScore(score: score)
            }else {
                currentDartThrow.addSingleFaultyDartScore()
            }
            
            switchPlayers()
        }
    }
    
    func hasDartThrowHitField(dartThrow: DartThrow, field: SplitScoreFields) -> Bool {
        var hasHit: Bool = false
        for i in 0..<dartThrow.darts.count {
            if dartThrow.darts[i].fieldName.title == field.title {
                return true
            }else if field == SplitScoreFields.double {
                hasHit = dartThrow.darts[i].scoreType == ScoreType.double
            }else if field == SplitScoreFields.triple {
                hasHit = dartThrow.darts[i].scoreType == ScoreType.triple
            }
            if hasHit {
                return true
            }
        }
        return false
    }
    
    func recalculateScores(playerId: UUID) -> Int {
        var score: Int = 40
        let index = fieldToHit.firstIndex(of: currentFieldToHit)!
        let playerDartThrows = dartThrows[playerId]!
        if playerDartThrows.count == 0 {
            return 40
        }
        for i in 0..<index {
            if hasDartThrowHitField(dartThrow: playerDartThrows[i], field: fieldToHit[i]) {
                score += playerDartThrows[i].dartThrowScore
            }else {
                score = (score+1)/2
            }
        }
        return score
    }
    
    override func removeDartThrow() {
        var canRemoveDart: Bool = currentDartThrow.darts.count > 0
        
        for player in players {
            if canRemoveDart {
                break
            }
            if !dartThrows[player.playerId]!.isEmpty {
                for dart in dartThrows[player.playerId]! {
                    if canRemoveDart {
                        break
                    }
                    if dart.darts.count > 1 {
                        canRemoveDart = true
                    }
                }
            }
        }
        
        if !canRemoveDart {
            return
        }
        //Switch player & currentDartThrow to previous before removing last dartThrow
        if currentDartThrow.darts.count == 0 {
            let index = players.firstIndex(of: currentPlayer)
            
            if index == 0 {
                currentPlayer = players.last!
                let index = fieldToHit.firstIndex(of: currentFieldToHit)!
                currentFieldToHit = fieldToHit[index - 1]
            } else {
                currentPlayer = players[index! - 1]
            }
            currentDartThrow = dartThrows[currentPlayer.playerId]!.removeLast()
        }
        let _ = currentDartThrow.removeLastDartThrow()!
        
        playerScores.updateValue(recalculateScores(playerId: currentPlayer.playerId), forKey: currentPlayer.playerId)
    }
    
    func getTotalGameScore() -> Int {
        return playerScores.values.reduce(0, +)
    }
    
    override func getPlayersSortedScore() -> [UUID] {
        let sortedByValueDictionary = playerScores.sorted{ $0.value > $1.value }
        return sortedByValueDictionary.map(\.key)
    }
}

func createSplitScoreGame(players: [Player]) -> SplitScoreGame {
    return SplitScoreGame(players: players)
}

func createDummySplitScoreGame() -> SplitScoreGame {
    let players: [Player] = createDummyPlayers(playersNumber: 3)
    
    return SplitScoreGame(players: players)
}
