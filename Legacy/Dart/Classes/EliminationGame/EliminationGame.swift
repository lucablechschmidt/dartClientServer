//
//  EliminationGame.swift
//  Dart
//
//  Created by Luca Blechschmidt on 29.01.25.
//

import Foundation

class EliminationGame: Game {
    let finishPoints: Int
    let outConstriction: GameTypeOut
    
    var eliminations: Dictionary<UUID, Elimination> = [:]
    
    init(players: [Player], finishPoints: Int, outConstriction: GameTypeOut) {
        self.finishPoints = finishPoints
        self.outConstriction = outConstriction
        
        super.init(players: players, points: 0)
    }
    
    func restart() {
        self.dartThrows = [:]
        self.playerScores = [:]
        
        for player in players {
            dartThrows.updateValue([], forKey: player.playerId)
            playerScores.updateValue(0, forKey: player.playerId)
        }
    }
    
    func isValidDartScore(_ score: SingleDartsScore) -> Bool {
        if playerScores[currentPlayer.playerId]! + score.totalScoreOfDart == finishPoints {
            if outConstriction == GameTypeOut.SingleOut && score.scoreType == ScoreType.normal {
                gameHasEnded = true
                return true
            } else if outConstriction == GameTypeOut.DoubleOut && score.scoreType == ScoreType.double {
                gameHasEnded = true
                return true
            } else if outConstriction == GameTypeOut.TripleOut && score.scoreType == ScoreType.triple {
                gameHasEnded = true
                return true
            }
            return false
        }else if playerScores[currentPlayer.playerId]! + score.totalScoreOfDart > finishPoints {
            return false
        }
        
        return true
    }
    
    override func addDartThrow(score: SingleDartsScore) {
        let isValid = isValidDartScore(score)
        if !isValid {
            currentDartThrow.addSingleFaultyDartScore()
            switchPlayers()
            return
        }
        
        let playerScore = playerScores[currentPlayer.playerId]! + score.totalScoreOfDart
        for player in self.players {
            if player != currentPlayer {
                if playerScore == playerScores[player.playerId]! {
                    let elimination = Elimination(dart: score)
                    elimination.addElimination(player: player, points: playerScore)
                    eliminations.updateValue(elimination, forKey: currentPlayer.playerId)
                    playerScores.updateValue(0, forKey: player.playerId)
                }
            }
        }
        
        if currentDartThrow.darts.count < 2 {
            currentDartThrow.addSingleDartScore(score: score)
            playerScores.updateValue(playerScore, forKey: currentPlayer.playerId)
        } else {
            currentDartThrow.addSingleDartScore(score: score)
            playerScores.updateValue(playerScore, forKey: currentPlayer.playerId)
            if currentDartThrow.dartThrowScore == 180 {
                playSound()
            }
            switchPlayers()
        }
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
            } else {
                currentPlayer = players[index! - 1]
            }
            
            currentDartThrow = dartThrows[currentPlayer.playerId]!.removeLast()
        }
        
        //Update Player Points and remove SingleDartScore
        let removedDart = currentDartThrow.removeLastDartThrow()!
        let previousPlayerScore = playerScores[currentPlayer.playerId]!
        
        let hasEliminated = eliminations[currentPlayer.playerId]?.dartHasEliminated() ?? false
        if hasEliminated {
            let dartEliminations = eliminations[currentPlayer.playerId]
            if removedDart == dartEliminations!.dart {
                for (playerId, points) in dartEliminations!.elimination {
                    playerScores.updateValue(points, forKey: playerId)
                    dartEliminations!.elimination.removeValue(forKey: playerId)
                }
            }
        }
        
        playerScores.updateValue(previousPlayerScore-removedDart.totalScoreOfDart, forKey: currentPlayer.playerId)
        
    }
    
    func getNextEleminationPoints() -> String {
        var scores = playerScores
        scores.removeValue(forKey: currentPlayer.playerId)
        
        let sortedByValueDictionary = scores.sorted{ $0.value < $1.value }.filter{ $0.value > playerScores[currentPlayer.playerId]! }
        return sortedByValueDictionary.isEmpty ? "-" : String(sortedByValueDictionary[0].value - playerScores[currentPlayer.playerId]!)
    }
}

func createDummyEliminationGame() -> EliminationGame {
    let players = createDummyPlayers(playersNumber: 3)
    let outConstriction: GameTypeOut = GameTypeOut.SingleOut
    
    return EliminationGame(players: players, finishPoints: 301, outConstriction: outConstriction)
}
