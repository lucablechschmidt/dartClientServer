//
//  SplitScoreGameView.swift
//  Dart
//
//  Created by Luca Blechschmidt on 29.01.25.
//

import SwiftUI

struct SplitScoreGameView: View {
    @StateObject var game: Game
    
    @Binding var gameView: GameViews
    @Binding var gameProgress: GameViewStates
    
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
                SplitScoreGameInProgressView(game: game as! SplitScoreGame, gameProgress: $gameProgress).environmentObject(game)
            }
        }
        else if gameProgress == GameViewStates.gameVictory {
            SplitScoreGameVictoryView(game: game as! SplitScoreGame, gameProgress: $gameProgress).environmentObject(game)
        }
    }
}

#Preview {
    let splitScoreGame = createDummySplitScoreGame()
    
    SplitScoreGameView(game: splitScoreGame, gameView: .constant(GameViews.ClassicGame), gameProgress: .constant(GameViewStates.gameInProgress)).environmentObject(splitScoreGame)
}
