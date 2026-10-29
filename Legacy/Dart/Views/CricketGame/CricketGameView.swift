//
//  CricketGameView.swift
//  Dart
//
//  Created by Luca Blechschmidt on 27.01.25.
//

import SwiftUI

struct CricketGameView: View {
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
                            .foregroundColor(Color("TextColor")).font(.system(size: 25))
                    }.padding([.top, .leading], 15)
                    Spacer()
                }
                CricketGameInProgressView(game: game, gameProgress: $gameProgress).environmentObject(game)
            }
        }
        else if gameProgress == GameViewStates.gameVictory {
            CricketGameVictoryView(game: game as! CricketGame, gameProgress: $gameProgress).environmentObject(game)
        }
    }
}

#Preview {
    let cricketGame = createDummyCricketGame()
    
    CricketGameView(game: cricketGame, gameView: .constant(GameViews.ClassicGame), gameProgress: .constant(GameViewStates.gameInProgress)).environmentObject(cricketGame)
}
