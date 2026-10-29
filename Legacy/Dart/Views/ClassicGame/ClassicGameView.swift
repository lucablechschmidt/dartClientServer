//
//  ClassicGameView.swift
//  Dart
//
//  Created by Luca Blechschmidt on 25.01.25.
//

import SwiftUI

struct ClassicGameView: View {
    @StateObject var game: Game
    
    @Binding var gameView: GameViews
    @Binding var gameProgress: GameViewStates
    @Binding var gameStartPoints: Int
    
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
                Spacer()
                ClassicGameInProgressView(game: game, gameProgress: $gameProgress).environmentObject(game).frame(height:  UIScreen.main.bounds.height * 21 / 25)
            }
        }
        else if gameProgress == GameViewStates.gameVictory {
            ClassicGameVictoryView(game: game as! ClassicGame, gameProgress: $gameProgress, gameStartPoints: $gameStartPoints).environmentObject(game)
        }
    }
    
}

#Preview {
    let classicGame = createDummyClassicGame(players: 4)
    
    ClassicGameView(game: classicGame, gameView: .constant(GameViews.ClassicGame), gameProgress: .constant(GameViewStates.gameInProgress), gameStartPoints: .constant(501)).environmentObject(classicGame)
}
