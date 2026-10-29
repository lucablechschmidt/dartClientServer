//
//  CricketGameSetUpView.swift
//  Dart
//
//  Created by Luca Blechschmidt on 26.01.25.
//

import SwiftUI
import OrderedCollections

struct CricketGameSetUpView: View {
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
                        .foregroundColor(Color("TextColor"))
                }.padding(.leading, 15)
                Spacer()
                if(gameCanStart) {
                    Button(action: {
                        gameProgress = GameViewStates.gameInProgress
                    }) {
                        Text("Start Game").font(.system(size: 25)).foregroundColor(Color("TextColor"))
                    }
                }
                Image(systemName: "chevron.left.circle").opacity(0)
                Spacer()
            }
            PlayerSelectionView(selectedPlayers: $players).padding(.top, 15).onChange(of: players) {checkValues()}
            Spacer()
        }.font(.system(size: 25)).foregroundColor(Color.black)
        
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
    
    CricketGameSetUpView(gameView: .constant(GameViews.ClassicGame), gameProgress: .constant(gameProgress), players: .constant(players), gameCanStart: .constant(gameCanStart))
}
