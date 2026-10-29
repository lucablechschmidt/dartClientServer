//
//  SplitScoreGameSetUpView.swift
//  Dart
//
//  Created by Luca Blechschmidt on 29.01.25.
//

import SwiftUI
import OrderedCollections

struct SplitScoreGameSetUpView: View {
    @Binding var gameView: GameViews
    @Binding var gameProgress: GameViewStates
    
    @Binding var players: OrderedSet<Player>
    
    @Binding var gameCanStart: Bool
    
    var body: some View {
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
                if(gameCanStart) {
                    Button(action: {
                        gameProgress = GameViewStates.gameInProgress
                    }) {
                        Text("Start Game")
                            .font(.title)
                            .foregroundColor(Color("TextColor"))
                            .frame(height: 30)
                    }
                }
                Spacer()
                Spacer()
                    .frame(width: 55, height: 30)
            }
            PlayerSelectionView(selectedPlayers: $players).padding(.top, 15).onChange(of: players) {checkValues()}
            Spacer()
        }
        
    }
    
    func checkValues() {
        if(players.isEmpty) {
            gameCanStart = false
            return
        }
 
        gameCanStart = true
    }
}

#Preview {
    let gameProgress: GameViewStates = GameViewStates.gameSetUp
    let players: OrderedSet<Player> = []
    let gameCanStart: Bool = false
    
    SplitScoreGameSetUpView(gameView: .constant(GameViews.ClassicGame), gameProgress: .constant(gameProgress), players: .constant(players), gameCanStart: .constant(gameCanStart))
}
