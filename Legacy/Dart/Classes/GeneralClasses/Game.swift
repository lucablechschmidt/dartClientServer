//
//  Game.swift
//  Dart
//
//  Created by Luca Blechschmidt on 25.01.25.
//

import Foundation
import SwiftUI
import AVFAudio

class Game: ObservableObject {
    private var audioPlayer: AVAudioPlayer!
    
    let gameId: UUID = UUID()
    let multiplayer: Bool
    let players: [Player]
    
    var playerScores: Dictionary<UUID, Int> = [:]
    var dartThrows: Dictionary<UUID, [DartThrow]> = [:]
    
    var currentPlayer: Player
    var currentDartThrow: DartThrow
    
    var gameHasEnded: Bool = false
    
    init(players: [Player], points: Int) {
        self.players = players
        self.currentPlayer = players.first!
        self.currentDartThrow = DartThrow()
        
        self.multiplayer = players.count > 2
        
        for player in players {
            self.dartThrows.updateValue([], forKey: player.playerId)
            self.playerScores.updateValue(points, forKey: player.playerId)
        }
    }
    
    func playSound() {
        let file = "180-" + "\(Int.random(in: 1...3))"
        guard let soundFile = NSDataAsset(name: file) else {
                print("could not read sound file!")
                return
            }
        do {
            try AVAudioSession.sharedInstance().setCategory(
                AVAudioSession.Category.ambient
            )
            try AVAudioSession.sharedInstance().setActive(true)
            audioPlayer = try AVAudioPlayer(data: soundFile.data)
            audioPlayer.play()
        } catch {
            print("Error: \(error.localizedDescription)")
        }
    }
    
    func hasSomeoneWontheGame() -> Bool {
        return gameHasEnded
    }
    
    func isFirtsDart() -> Bool {
        if currentDartThrow.darts.count != 0 {
            return false
        }
        if dartThrows.values.reduce(0, { x, y in x + y.count}) > 0 {
            return false
        }
        return true
    }
    
    func switchPlayerOrder(player: Player) {
        
    }
    
    func switchStartingPlayer(player: Player) {
        currentPlayer = player
    }
    
    // Switch the player after the third dart is thrown, or the score is overthrown
    func switchPlayers() {
        var playerDartThrows: [DartThrow] = dartThrows[currentPlayer.playerId] ?? []
        playerDartThrows.append(currentDartThrow)
        
        dartThrows.updateValue(playerDartThrows, forKey: currentPlayer.playerId)
        currentDartThrow = DartThrow()
        let index = players.firstIndex(of: currentPlayer)
        if index == players.count - 1 {
            currentPlayer = players.first!
        } else {
            currentPlayer = players[index! + 1]
        }
    }
    
    func getPlayerScore(playerId: UUID) -> Int {
        return playerScores[playerId] ?? -1
    }
    
    func getPlayerLastDartThrow(playerId:UUID) -> DartThrow {
        if playerId == currentPlayer.playerId {
            return currentDartThrow
        } else {
            return dartThrows[playerId]?.last ?? DartThrow()
        }
    }
    
    func getPlayerDarts(playerId: UUID) -> Int {
        var darts: Int = 0
        let playerThrows: [DartThrow] = dartThrows[playerId] ?? []
        if playerId == currentPlayer.playerId && !gameHasEnded {
            darts = currentDartThrow.getDartsThrown()
        }
        for dartTrow in playerThrows {
            darts += dartTrow.getDartsThrown()
        }
        return darts
    }
    
    private func getPlayerDartsScore(playerId: UUID) -> Int {
        var score: Int = 0
        for darts in dartThrows[playerId] ?? [] {
            if darts.faulty {
                continue
            }
            score += darts.dartThrowScore
        }
        return score
    }
    
    func getPlayerDartAverage(playerId: UUID) -> Double {
        let playerScore: Double = Double(getPlayerDartsScore(playerId: playerId))
        var playerDarts: Double = 0
        if gameHasEnded {
            playerDarts = Double(getPlayerDarts(playerId: playerId))
        } else {
            playerDarts = Double(dartThrows[playerId]?.count ?? 0)
        }
        if playerDarts == 0 {
            return 0
        }
        return Double(playerScore / playerDarts)
    }
    
    func getPlayerAverage(playerId: UUID) -> Double {
        let playerScore: Double = Double(getPlayerDartsScore(playerId: playerId))
        let playerVisits: Double = Double(dartThrows[playerId]?.count ?? 0)
        if playerVisits == 0 {
            return 0
        }
        
         return Double(playerScore / playerVisits)
    }
    
    // Add a dart to the score
    func addDartThrow(score: SingleDartsScore) {
        let playerScore = playerScores[currentPlayer.playerId]!
        if currentDartThrow.darts.count < 2 {
            addDart(score: score, playerScore: playerScore)
        } else {
            addDart(score: score, playerScore: playerScore)
            if currentDartThrow.dartThrowScore == 180 {
                playSound()
            }
            switchPlayers()
        }
    }
    
    func addDart(score: SingleDartsScore, playerScore: Int) {
        currentDartThrow.addSingleDartScore(score: score)
        playerScores.updateValue(playerScore+score.totalScoreOfDart, forKey: currentPlayer.playerId)
    }
    
    func removeDartThrow() {
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
        
        //Switch player & currentDartThrow to previous
        if currentDartThrow.darts.count == 0 {
            let index = players.firstIndex(of: currentPlayer)
            
            if index == 0 {
                currentPlayer = players.last!
            } else {
                currentPlayer = players[index! - 1]
            }
            
            currentDartThrow = dartThrows[currentPlayer.playerId]!.removeLast()
            let removedDart = currentDartThrow.removeLastDartThrow()!
            let previousPlayerScore = playerScores[currentPlayer.playerId]!
            playerScores.updateValue(previousPlayerScore-removedDart.totalScoreOfDart, forKey: currentPlayer.playerId)
        } else {
            //Update Player Points and remove SingleDartScore
            let removedDart = currentDartThrow.removeLastDartThrow()!
            let previousPlayerScore = playerScores[currentPlayer.playerId]!
            playerScores.updateValue(previousPlayerScore-removedDart.totalScoreOfDart, forKey: currentPlayer.playerId)
        }
        
    }
    
    func removeWinningDart() {
        currentDartThrow = dartThrows[currentPlayer.playerId]!.removeLast()
        let removedDart = currentDartThrow.removeLastDartThrow()!
        let previousPlayerScore = playerScores[currentPlayer.playerId]!
        playerScores.updateValue(previousPlayerScore-removedDart.totalScoreOfDart, forKey: currentPlayer.playerId)
        
        dartThrows.updateValue(dartThrows[currentPlayer.playerId]!, forKey: currentPlayer.playerId)
        gameHasEnded = false
    }
    
    // Sorted by highest score
    func getPlayersSortedScore() -> [UUID] {
        let sortedByValueDictionary = playerScores.sorted{ $0.value > $1.value }
        return sortedByValueDictionary.map(\.key)
    }
    
}

func createDummyGame() -> Game {
    let players: [Player] = createDummyPlayers(playersNumber: 3)
    let points: Int = 501
    
    return Game(players: players, points: points)
}
