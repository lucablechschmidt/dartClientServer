//
//  ClassicGameSetUpView.swift
//  Dart
//
//  Created by Luca Blechschmidt on 25.01.25.
//

import SwiftUI
import OrderedCollections

struct ClassicGameSetUpView: View {
    @Binding var gameView: GameViews
    @Binding var gameProgress: GameViewStates
    
    @Binding var players: OrderedSet<Player>
    @Binding var points: Int
    
    @Binding var inConstriction: GameTypeIn
    @Binding var outConstriction: GameTypeOut
    @Binding var setsToWinGame: Int
    @Binding var legsToWinSet: Int
    
    @Binding var gameCanStart: Bool
    var body: some View {
        VStack {
            HStack {
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
            HStack(alignment: .top){
                CustomMenu(title: "", isDisabled: false, hasCustomItems: false, formatter: nil, labels: GameTypeIn.allCases, selectedItem: $inConstriction)
                    .padding([.leading, .trailing], 5)
                    .frame(height: 75)
                CustomMenu(title: "", isDisabled: false, hasCustomItems: false, formatter: nil, labels: GameTypeOut.allCases, selectedItem: $outConstriction)
                    .padding([.leading, .trailing], 5)
                    .frame(height: 75)
            }
            HStack(alignment: .top) {
                CustomMenu(title: "Sets", isDisabled: false, hasCustomItems: true, formatter: NumberFormatter(), labels: [1, 3, 5], selectedItem: $setsToWinGame)
                    .padding([.leading, .trailing], 5)
                    .frame(height: 75)
                CustomMenu(title: "", isDisabled: false, hasCustomItems: true, formatter: NumberFormatter(), labels: [501, 401, 301], selectedItem: $points)
                    .padding([.leading, .trailing], 5)
                    .frame(height: 75)
                CustomMenu(title: "Legs", isDisabled: false, hasCustomItems: true, formatter: NumberFormatter(), labels: [1, 3, 5], selectedItem: $legsToWinSet)
                    .padding([.leading, .trailing], 5)
                    .frame(height: 75)
            }
            
            PlayerSelectionView(selectedPlayers: $players)
                .padding(.top, 15)
                .onChange(of: players) {checkValues()}
            Spacer()
        }.font(.title).foregroundColor(Color.black)
        
    }
    
    func checkValues() {
        if(players.isEmpty || points<0 || setsToWinGame<0 || legsToWinSet<0) {
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
    
    let inConstriction: GameTypeIn = GameTypeIn.SingleIn
    let outConstriction: GameTypeOut = GameTypeOut.DoubleOut
    
    let setsToWinGame: Int = 1
    let legsToWinSet: Int = 1
    
    let gameCanStart: Bool = false

    ClassicGameSetUpView(gameView: .constant(GameViews.ClassicGame), gameProgress: .constant(gameProgress), players: .constant(players), points: .constant(points), inConstriction: .constant(inConstriction), outConstriction: .constant(outConstriction), setsToWinGame: .constant(setsToWinGame), legsToWinSet: .constant(legsToWinSet), gameCanStart: .constant(gameCanStart))
}
