//
//  SplitScoreGameVictoryView.swift
//  Dart
//
//  Created by Luca Blechschmidt on 29.01.25.
//

import SwiftUI

struct SplitScoreGameVictoryView: View {
    @StateObject var game: SplitScoreGame
    
    @Binding var gameProgress: GameViewStates
    
    var body: some View{
        VStack(spacing: 1) {
            ForEach(game.getPlayersSortedScore(), id: \.self) { playerId in
                let player = game.players.first(where: {$0.playerId == playerId})!
                Text("\(player.name): \(game.playerScores[player.playerId]!)")
                    .font(.title2)
                    .fontWeight(.semibold)
                    .foregroundColor(Color("TextColor"))
                
            }
            /*ForEach(game.players, id: \.self){ player in
                Text("\(player.name): \(game.playerScores[player.playerId]!)")
                    .font(.title2)
                    .fontWeight(.semibold)
                    .foregroundColor(Color("TextColor"))
            }*/
        }.padding(1)
        
        Text("Total points scored: \(game.getTotalGameScore())")
            .font(.body)
            .fontWeight(.semibold)
            .foregroundColor(Color("TextColor"))
            .padding(2)
        
        Button(action: {
            game.removeDartThrow()
            gameProgress = GameViewStates.gameInProgress
            game.gameHasEnded = false
        }) {
            Text("Letzten Wurf rückgängig machen")
                .foregroundColor(Color("TextColor"))
        }
        Button(action: {
            game.restart()
            gameProgress = GameViewStates.gameInProgress
            game.gameHasEnded = false
        }) {
            Text("Restart Game")
                .foregroundColor(Color("TextColor"))
        }
        Text("EndGame").foregroundColor(Color("TextColor")).onTapGesture {
            gameProgress = GameViewStates.gameSetUp
            game.gameHasEnded = true
        }
    }
}

#Preview {
    let splitScore = createDummySplitScoreGame()
    
    SplitScoreGameVictoryView(game: splitScore, gameProgress: .constant(GameViewStates.gameVictory)).environmentObject(splitScore)
}
