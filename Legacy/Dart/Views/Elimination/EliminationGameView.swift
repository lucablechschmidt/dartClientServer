//
//  EliminationGameView.swift
//  Dart
//
//  Created by Luca Blechschmidt on 29.01.25.
//

import SwiftUI

struct EliminationGameView: View {
    @StateObject var game: Game
    
    @Binding var gameView: GameViews
    @Binding var gameProgress: GameViewStates
    @Binding var points: Int
    
    @State var refresh: Bool = false
    var body: some View {
        if gameProgress == GameViewStates.gameInProgress {
            VStack {
                HStack{
                    Button(action: {
                        gameView = GameViews.GameSelection
                    }){
                        Image(systemName: "chevron.left.circle")
                            .font(.title)
                            .foregroundColor(Color("TextColor"))
                    }.frame(width: 55, height: 30)
                    Spacer()
                }
                EliminationGameInProgressView(game: game as! EliminationGame, gameProgress: $gameProgress).environmentObject(game)
            }
        }
        else if gameProgress == GameViewStates.gameVictory {
            EliminationGameVictoryView(game: game as! EliminationGame, gameProgress: $gameProgress).environmentObject(game as! EliminationGame)
        }
    }
}

#Preview {
    let eliminationGame = createDummyEliminationGame()
    
    EliminationGameView(game: eliminationGame, gameView: .constant(GameViews.ClassicGame), gameProgress: .constant(GameViewStates.gameInProgress), points: .constant(501)).environmentObject(eliminationGame)
}
