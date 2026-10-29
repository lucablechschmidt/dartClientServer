//
//  ClassicGame.swift
//  Dart
//
//  Created by Luca Blechschmidt on 25.01.25.
//

import Foundation

class ClassicGame: Game {
    let gameType: GameType
    let pointsToWin: Int
    
    var currentLeg: Leg
    
    init(players: [Player], gameType: GameType, pointsToWin: Int) {
        self.gameType = gameType
        self.pointsToWin = pointsToWin
        
        self.currentLeg = Leg(scoreToWinLeg: pointsToWin, players: players)

        super.init(players: players, points: pointsToWin)
    }
    
    override func switchPlayers() {
        var playerDartThrows: [DartThrow] = dartThrows[currentPlayer.playerId] ?? []
        playerDartThrows.append(currentDartThrow)
        
        dartThrows.updateValue(playerDartThrows, forKey: currentPlayer.playerId)
        addDartThrowToLeg(playerId: currentPlayer.playerId, dartThrow: currentDartThrow)
        currentDartThrow = DartThrow()
        let index = players.firstIndex(of: currentPlayer)
        if index == players.count - 1 {
            currentPlayer = players.first!
        } else {
            currentPlayer = players[index! + 1]
        }
    }
    
    //TODO: redo restart mechanic
    func restart(gameStartPoints: Int) {
        gameHasEnded = false
        dartThrows = [:]
        playerScores = [:]
        
        for player in players {
            dartThrows.updateValue([], forKey: player.playerId)
            playerScores.updateValue(gameStartPoints, forKey: player.playerId)
        }
        
        currentDartThrow = DartThrow()
        currentPlayer = players.last!
            
        currentLeg = Leg(scoreToWinLeg: pointsToWin, players: players)
    }

    func addDartThrowToLeg(playerId: UUID, dartThrow: DartThrow) {
        var darts = currentLeg.dartThrows[playerId]!
        darts.append(dartThrow)
        currentLeg.dartThrows.updateValue(darts, forKey: playerId)
    }
    
    // Check for special Constrictions to start/ finish
    func isValidDartScore(leg: Leg, playerScore: Int, dart: SingleDartsScore, gameTypeIn: GameTypeIn, gameTypeOut: GameTypeOut) -> Bool {
        // Check if Player can start the game
        if playerScore == leg.scoreToWinLeg {
            switch gameTypeIn {
                case .DoubleIn:
                    return dart.scoreType == .double ? true : false
                case .TripleIn:
                    return dart.scoreType == .triple ? true : false
                case .SingleIn:
                    return true
            }
        }
        
        
        // Check if Player can end the game
        if playerScore - dart.totalScoreOfDart == 0 {
            switch gameTypeOut {
                case .SingleOut:
                    return true
                case .DoubleOut:
                    return dart.scoreType == .double ? true : false
                case .TripleOut:
                    return dart.scoreType == .triple ? true : false
            }
        }
        
        //Check if player makes mistake
        switch gameTypeOut {
            case .SingleOut:
                return playerScore - dart.totalScoreOfDart < 1 ? false : true
            case .DoubleOut:
                return playerScore - dart.totalScoreOfDart < 2 ? false : true
            case .TripleOut:
                return playerScore - dart.totalScoreOfDart < 3 ? false : true
        }
    }

    
    // Add a dart to the score
    override func addDartThrow(score: SingleDartsScore) {
        let playerScore = playerScores[currentPlayer.playerId]!
        let isValid = isValidDartScore(leg: currentLeg, playerScore: playerScore, dart: score, gameTypeIn: gameType.inConstriction, gameTypeOut: gameType.outConstriction)
        if !isValid {
            for i in 0...currentDartThrow.darts.count {
                let faultyDart = currentDartThrow.darts[i]
                let previousPlayerScore = playerScores[currentPlayer.playerId]!
                playerScores.updateValue(previousPlayerScore+faultyDart.totalScoreOfDart, forKey: currentPlayer.playerId)
            }
            
            currentDartThrow.addFaultyDartScore()
            switchPlayers()
            return
        }
        
        if playerScore - score.totalScoreOfDart == 0 {
            addDart(score: score, playerScore: playerScore)
            var playerDartThrows: [DartThrow] = dartThrows[currentPlayer.playerId] ?? []
            playerDartThrows.append(currentDartThrow)
            
            dartThrows.updateValue(playerDartThrows, forKey: currentPlayer.playerId)
            gameHasEnded = true
            return
        }
        
        if currentDartThrow.darts.count < 2 {
            addDart(score: score, playerScore: playerScore)
        } else {
            addDart(score: score, playerScore: playerScore)
            if currentDartThrow.dartThrowScore == 180 {
                print("180")
                playSound()
            }
            switchPlayers()
        }
    }
    
    override func addDart(score: SingleDartsScore, playerScore: Int) {
        currentDartThrow.addSingleDartScore(score: score)
        playerScores.updateValue(playerScore-score.totalScoreOfDart, forKey: currentPlayer.playerId)
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
        let faulty = currentDartThrow.faulty
        let removedDart = currentDartThrow.removeLastDartThrow()!
        let previousPlayerScore = playerScores[currentPlayer.playerId]!
        if faulty {
            playerScores.updateValue(previousPlayerScore-currentDartThrow.dartThrowScore, forKey: currentPlayer.playerId)
        } else {
            playerScores.updateValue(previousPlayerScore+removedDart.totalScoreOfDart, forKey: currentPlayer.playerId)
        }
        
    }
    
    override func removeWinningDart() {
        print(dartThrows[currentPlayer.playerId]!.count)
        currentDartThrow = dartThrows[currentPlayer.playerId]!.removeLast()
        let removedDart = currentDartThrow.removeLastDartThrow()!
        let previousPlayerScore = playerScores[currentPlayer.playerId]!
        playerScores.updateValue(previousPlayerScore+removedDart.totalScoreOfDart, forKey: currentPlayer.playerId)
        
        dartThrows.updateValue(dartThrows[currentPlayer.playerId]!, forKey: currentPlayer.playerId)
        print(dartThrows[currentPlayer.playerId]!.count)
        gameHasEnded = false
    }
    
    func switchLegs(winningPlayer: Player) {
        
    }
    
    func switchSets() {
        //TODO: Finish game on last Set
        gameHasEnded = true
    }
    
    override func getPlayersSortedScore() -> [UUID] {
        let sortedByValueDictionary = playerScores.sorted{ $0.value < $1.value }
        return sortedByValueDictionary.map(\.key)
    }
}

func createClassicGame(players: [Player], gameType: GameType, pointsToWinLeg: Int, setsToWinGame: Int, legsToWinSet: Int) -> ClassicGame {
    var dartThrows: Dictionary<UUID, [DartThrow]> = [:]
    var playerScores: Dictionary<UUID, Int> = [:]
    
    for player in players {
        dartThrows.updateValue([], forKey: player.playerId)
        playerScores.updateValue(pointsToWinLeg, forKey: player.playerId)
    }
    
    return ClassicGame(players: players, gameType: gameType, pointsToWin: pointsToWinLeg)
}

func createDummyClassicGame(players: Int) -> ClassicGame {
    let players: [Player] = createDummyPlayers(playersNumber: players)
    let pointsToWinLeg: Int = 101
    let gameType: GameType = createDummyGameType()
    
    
    var dartThrows: Dictionary<UUID, [DartThrow]> = [:]
    var playerScores: Dictionary<UUID, Int> = [:]
    
    for player in players {
        dartThrows.updateValue([], forKey: player.playerId)
        playerScores.updateValue(pointsToWinLeg, forKey: player.playerId)
    }
    
    return ClassicGame(players: players, gameType: gameType, pointsToWin: pointsToWinLeg)
}
