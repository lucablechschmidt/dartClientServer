//
//  CricketScoreInputView.swift
//  Dart
//
//  Created by Luca Blechschmidt on 27.01.25.
//

import SwiftUI

struct CricketScoreInputView: View {
    @StateObject var game: Game
    
    @Binding var gameProgress: GameViewStates
    
    @Binding var refresh: Bool
    
    @State var isDouble: Bool = false
    @State var isTriple: Bool = false
    
    let buttons: [[InputButtons]] = [
        [.zero, .fifteen, .sixteen, .seventeen],
        [.eighteen, .nineteen, .twenty, .bull],
        [.double, .triple, .undo]
    ]
    
    var body: some View {
        ForEach(buttons, id: \.self){ row in
            HStack(spacing: 5){
                ForEach(row, id: \.self){ button in
                    ButtonsView(gameProgress: $gameProgress, button: button, refresh: $refresh, isDouble: $isDouble, isTriple: $isTriple).environmentObject(game)
                }
            }
        }
    }
}

#Preview {
    let cricketGame = createDummyCricketGame()
    
    CricketScoreInputView(game: cricketGame, gameProgress: .constant(GameViewStates.gameInProgress), refresh: .constant(false)).environmentObject(cricketGame)
}
