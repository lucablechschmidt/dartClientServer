//
//  CricketGameVictoryView.swift
//  Dart
//
//  Created by Luca Blechschmidt on 29.01.25.
//

import SwiftUI

struct CricketGameVictoryView: View {
    @StateObject var game: CricketGame
    
    @Binding var gameProgress: GameViewStates
    var body: some View{
        Text("You Win!")
            .foregroundColor(Color("TextColor"))
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
        Text("EndGame")
            .foregroundColor(Color("TextColor"))
            .onTapGesture {
            gameProgress = GameViewStates.gameSetUp
            game.gameHasEnded = true
        }
    }
}

#Preview {
    let cricketGame = createDummyCricketGame()
    
    CricketGameVictoryView(game: cricketGame, gameProgress: .constant(GameViewStates.gameVictory)).environmentObject(cricketGame)
}

