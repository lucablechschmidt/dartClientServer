//
//  NewGameView.swift
//  Dart
//
//  Created by Luca Blechschmidt on 25.01.25.
//

import SwiftUI

struct NewGameView: View {
    @State var gameSetUp: GameViews = GameViews.GameSelection
    
    var body: some View {
        VStack(spacing: 25) {
            Spacer()
            if gameSetUp == GameViews.ClassicGame {
                ClassicGameManagerView(gameView: $gameSetUp).toolbar(.hidden, for: .tabBar)
            }else if gameSetUp == GameViews.CricketGame {
                CricketGameManagerView(gameView: $gameSetUp).toolbar(.hidden, for: .tabBar)
            }else if gameSetUp == GameViews.EliminationGame {
                EliminationGameManagerView(gameView: $gameSetUp).toolbar(.hidden, for: .tabBar)
            }else if gameSetUp == GameViews.SplitScore {
                SplitScoreGameManagerView(gameView: $gameSetUp).toolbar(.hidden, for: .tabBar)
            }else if gameSetUp == GameViews.GameSelection {
                Text("Classic Game")
                    .font(.title)
                    .foregroundColor(Color("TextColor"))
                    .onTapGesture {
                        gameSetUp = GameViews.ClassicGame
                    }
                Text("Cricket")
                    .font(.title)
                    .foregroundColor(Color("TextColor")).onTapGesture {
                    gameSetUp = GameViews.CricketGame
                }
                Text("Elimination")
                    .font(.title)
                    .foregroundColor(Color("TextColor")).onTapGesture {
                    gameSetUp = GameViews.EliminationGame
                }
                Text("SplitScore")
                    .font(.title)
                    .foregroundColor(Color("TextColor")).onTapGesture {
                    gameSetUp = GameViews.SplitScore
                }
            }
            else {
                Text("Error: No game found")
                    .font(.title)
                    .foregroundColor(Color("TextColor")).onTapGesture {
                    gameSetUp = GameViews.GameSelection
                }
            }
            Spacer()
        }
        
    }
    
    
}

#Preview {
    NewGameView()
}
