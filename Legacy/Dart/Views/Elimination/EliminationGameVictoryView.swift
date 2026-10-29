//
//  EliminationGameVictoryView.swift
//  Dart
//
//  Created by Luca Blechschmidt on 29.01.25.
//

import SwiftUI

struct EliminationGameVictoryView: View {
    @StateObject var game: EliminationGame
    
    @Binding var gameProgress: GameViewStates
    var body: some View {
        Text("You Win!")
            .font(.title)
            .foregroundColor(Color("TextColor"))
        Button(action: {
            game.removeDartThrow()
            gameProgress = GameViewStates.gameInProgress
            game.gameHasEnded = false
        }) {
            Text("Letzten Wurf rückgängig machen")
                .font(.title2)
                .foregroundColor(Color("TextColor"))
        }
        Button(action: {
            game.restart()
            gameProgress = GameViewStates.gameInProgress
            game.gameHasEnded = false
        }) {
            Text("Restart Game")
                .font(.title2)
                .foregroundColor(Color("TextColor"))
        }
        Text("EndGame")
            .font(.title2)
            .foregroundColor(Color("TextColor"))
            .onTapGesture {
            gameProgress = GameViewStates.gameSetUp
            game.gameHasEnded = true
        }
    }
}

#Preview {
    let eliminationGame = createDummyEliminationGame()
    
    EliminationGameVictoryView(game: eliminationGame, gameProgress: .constant(GameViewStates.gameVictory)).environmentObject(eliminationGame)
}
