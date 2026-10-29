//
//  ScoreInputView.swift
//  Dart
//
//  Created by Luca Blechschmidt on 25.01.25.
//

import SwiftUI

struct ScoreInputView: View {
    @EnvironmentObject var game: Game
    
    @Binding var gameProgress: GameViewStates
    
    @Binding var refresh: Bool
    
    @State var isDouble: Bool = false
    @State var isTriple: Bool = false
    
    let horizontalSpacing = UIScreen.main.bounds.width / 48
    
    let buttons: [[InputButtons]] = [
        [.one, .two, .three, .four, .five],
        [.six, .seven, .eight, .nine, .ten],
        [.eleven, .twelve, .thirteen, .fourteen, .fifteen],
        [.sixteen, .seventeen, .eighteen, .nineteen, .twenty],
        [.bull, .zero, .undo, .double, .triple, ]
    ]
    
   // (width: UIScreen.main.bounds.width / 6, height:  UIScreen.main.bounds.height / 15)
    
    var body: some View {
        VStack(spacing: 5) {
            ForEach(buttons, id: \.self){ row in
                HStack(spacing: 5){
                    ForEach(row, id: \.self){ button in
                        ButtonsView(gameProgress: $gameProgress, button: button, refresh: $refresh, isDouble: $isDouble, isTriple: $isTriple).environmentObject(game)
                    }
                }
            }
        }
        //.frame(width: UIScreen.main.bounds.width, height:  UIScreen.main.bounds.height * 2 / 5)
    }
}

#Preview {
    let classicGame = createDummyGame()
    
    ScoreInputView(gameProgress: .constant(GameViewStates.gameInProgress), refresh: .constant(false)).environmentObject(classicGame)
}
