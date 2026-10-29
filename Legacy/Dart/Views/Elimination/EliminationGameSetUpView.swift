//
//  EliminationGameSetUpView.swift
//  Dart
//
//  Created by Luca Blechschmidt on 29.01.25.
//

import SwiftUI
import OrderedCollections

struct EliminationGameSetUpView: View {
    @Binding var gameView: GameViews
    @Binding var gameProgress: GameViewStates
    
    @Binding var players: OrderedSet<Player>
    @Binding var points: Int
    
    @Binding var outConstriction: GameTypeOut
    
    @Binding var gameCanStart: Bool
    var body: some View {
        VStack(spacing: 15) {
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
                        Text("Start Game").font(.title).foregroundColor(Color("TextColor")).frame(height: 30)
                    }
                }
                Spacer()
                Spacer().frame(width: 55, height: 30)
            }
            HStack(alignment: .top){
                CustomMenu(title: "", isDisabled: false, hasCustomItems: false, formatter: nil, labels: GameTypeOut.allCases, selectedItem: $outConstriction)
                    .padding([.leading, .trailing], 5)
                    .frame(height: 75)
                CustomMenu(title: "", isDisabled: false, hasCustomItems: true, formatter: NumberFormatter(), labels: [501, 401, 301], selectedItem: $points)
                    .padding([.leading, .trailing], 5)
                    .frame(height: 75)
            }
            
            PlayerSelectionView(selectedPlayers: $players).padding(.top, 15).onChange(of: players) {checkValues()}
            Spacer()
        }.font(.title).foregroundColor(Color.black)
    }
    
    func checkValues() {
        if(players.isEmpty || points<0) {
            gameCanStart = false
            return
        }
 
        gameCanStart = true
    }
}

#Preview {
    let gameProgress: GameViewStates = GameViewStates.gameSetUp
    let players: OrderedSet<Player> = []
    let points: Int = 501
    
    let outConstriction: GameTypeOut = GameTypeOut.DoubleOut
    
    let gameCanStart: Bool = false
    
    EliminationGameSetUpView(gameView: .constant(GameViews.ClassicGame), gameProgress: .constant(gameProgress), players: .constant(players), points: .constant(points), outConstriction: .constant(outConstriction), gameCanStart: .constant(gameCanStart))
}
