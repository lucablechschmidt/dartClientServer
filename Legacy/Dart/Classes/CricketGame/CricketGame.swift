//
//  CricketGame.swift
//  Dart
//
//  Created by Luca Blechschmidt on 27.01.25.
//

import Foundation

enum CricketFields: CaseIterable, Hashable {
    case zero, fifteen, sixteen, seventeen, eighteen, nineteen, twenty, bull
    
    var title: String{
        switch self{
            case .zero: return "0"
            case .fifteen: return "15"
            case .sixteen: return "16"
            case .seventeen: return "17"
            case .eighteen: return "18"
            case .nineteen: return "19"
            case .twenty: return "20"
            case .bull: return "Bull"
        }
    }
}

class CricketGame: Game {
    var fields: Dictionary<CricketFields, Field> = [:]
    
    init(players: [Player]) {
        for cricketField in CricketFields.allCases{
            fields.updateValue(Field(players: players, cricketField: cricketField), forKey: cricketField)
        }
        super.init(players: players, points: 0)
    }
    
    func getCricketField(score: SingleDartsScore) -> CricketFields {
        switch score.fieldName {
            case DartFields.fifteen: return CricketFields.fifteen
            case DartFields.sixteen: return CricketFields.sixteen
            case DartFields.seventeen: return CricketFields.seventeen
            case DartFields.eighteen: return CricketFields.eighteen
            case DartFields.nineteen: return CricketFields.nineteen
            case DartFields.twenty: return CricketFields.twenty
            case DartFields.bull: return CricketFields.bull
            default: return CricketFields.zero
        }
    }
    
    func restart() {
        self.dartThrows = [:]
        self.playerScores = [:]
        
        for player in players {
            dartThrows.updateValue([], forKey: player.playerId)
            playerScores.updateValue(0, forKey: player.playerId)
        }
        
        for cricketField in CricketFields.allCases{
            fields.updateValue(Field(players: players, cricketField: cricketField), forKey: cricketField)
        }
    }
    
    func currentPlayerHasHighScore() -> Bool {
        for player in self.players {
            if player != currentPlayer {
                if playerScores[currentPlayer.playerId]! <= playerScores[player.playerId]! {
                    return false
                }
            }
        }
        return true
    }
    
    func currentPlayerClosedAllFields() -> Bool {
        for field in fields.values {
            if field.playersFieldHits[currentPlayer.playerId]!.count < 3 && field.field != CricketFields.zero{
                return false
            }
        }
        return true
    }
    
    func cricketGameIsDone(){
        gameHasEnded = currentPlayerHasHighScore() && currentPlayerClosedAllFields()
    }
    
    override func switchPlayers() {
        cricketGameIsDone()
        var playerDartThrows: [DartThrow] = dartThrows[currentPlayer.playerId] ?? []
        playerDartThrows.append(currentDartThrow)
        
        //playerScores.updateValue(playerScores[currentPlayer.playerId]! + currentDartThrow.dartThrowScore, forKey: currentPlayer.playerId)
        dartThrows.updateValue(playerDartThrows, forKey: currentPlayer.playerId)
        currentDartThrow = DartThrow()
        let index = players.firstIndex(of: currentPlayer)
        if index == players.count - 1 {
            currentPlayer = players.first!
        } else {
            currentPlayer = players[index! + 1]
        }
    }
    
    override func addDartThrow(score: SingleDartsScore) {
        let playerScore = playerScores[currentPlayer.playerId]!
        
        let cricketField = getCricketField(score: score)
        let scoredPoints = fields[cricketField]!.addPlayerDartsScore(playerId: currentPlayer.playerId, score: score)
        
        if currentDartThrow.darts.count < 2 {
            currentDartThrow.addSingleDartScore(score: score)
            playerScores.updateValue(playerScore+scoredPoints, forKey: currentPlayer.playerId)
            cricketGameIsDone()
        } else {
            currentDartThrow.addSingleDartScore(score: score)
            playerScores.updateValue(playerScore+scoredPoints, forKey: currentPlayer.playerId)
            cricketGameIsDone()
            
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
        
        let removedDart = currentDartThrow.removeLastDartThrow()!
        let previousPlayerScore = playerScores[currentPlayer.playerId]!
        let cricketField = getCricketField(score: removedDart)
        let scoredPoints = fields[cricketField]!.removePlayerDartScore(playerId: currentPlayer.playerId, score: removedDart)
        playerScores.updateValue(previousPlayerScore-scoredPoints, forKey: currentPlayer.playerId)
    }
    
}

func createDummyCricketGame() -> CricketGame {
    let players: [Player] = createDummyPlayers(playersNumber: 3)
    
    return CricketGame(players: players)
}

