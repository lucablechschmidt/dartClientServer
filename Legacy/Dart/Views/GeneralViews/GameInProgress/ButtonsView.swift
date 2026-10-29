//
//  ButtonsView.swift
//  Dart
//
//  Created by Luca Blechschmidt on 25.01.25.
//

import SwiftUI

func setScoreButtonBackgroundColor(title: InputButtons, isDouble: Bool, isTriple: Bool) -> Color {
    switch title {
        case .zero:     return Color("zero")
        case .double:   return Color("double")
        case .triple:   return Color("triple")
        case .undo:     return Color("undo")
    default:        return isDouble || isTriple ? Color("ScoreButtonsBackgroundColor").opacity(0.75) : Color("ScoreButtonsBackgroundColor")
    }
}

func setScoreButtonForegroundColor(title: InputButtons, isDouble: Bool, isTriple: Bool) -> Color {
    switch title {
        case .zero:     return Color("ScoreButtonsForegroundColor")
        case .double:   return Color("ScoreButtonsForegroundColor")
        case .triple:   return Color("ScoreButtonsForegroundColor")
        case .undo:     return Color("ScoreButtonsForegroundColor")
        default:
            if isDouble {
                return Color.yellow
            } else if isTriple {
                return title == InputButtons.bull ? Color.white : Color.green
            } else {
                return Color.white
            }
    }
    
}

struct ButtonsView: View {
    @EnvironmentObject var game: Game
    
    @Binding var gameProgress: GameViewStates
    
    var button: InputButtons
    
    @Binding var refresh: Bool
    
    @Binding var isDouble: Bool
    @Binding var isTriple: Bool
    
    var body: some View {
        Button( action: {
            buttonAction()
        }) {
            Text(button.title)
                .font(.title3)
                .frame(width: UIScreen.main.bounds.width / 6, height:  UIScreen.main.bounds.height / 15)
                .foregroundColor(setScoreButtonForegroundColor(title: button, isDouble: isDouble, isTriple: isTriple))
                .background(setScoreButtonBackgroundColor(title: button, isDouble: isDouble, isTriple: isTriple))
                .cornerRadius(18)
        }.disabled(disableButton(button: button)).opacity(disableButton(button: button) ? 0 : 1)
    }
    
    func buttonAction() {
        switch button {
            case .double:
                isDouble.toggle()
                isTriple = false
                return
            case .triple:
                isTriple.toggle()
                isDouble = false
                return
            case .undo:
                game.removeDartThrow()
                refresh.toggle()
                return
            default :
                break
        }
        let scoreType = isDouble || isTriple ? isDouble ? ScoreType.double : ScoreType.triple : ScoreType.normal
        game.addDartThrow(score: SingleDartsScore(field: button.value, scoreType: scoreType))
        
        isDouble = false
        isTriple = false
        
        if game.hasSomeoneWontheGame() {
            gameProgress = GameViewStates.gameVictory
        }
        refresh.toggle()
    }
    
    func disableButton(button: InputButtons) -> Bool {
        if isTriple && button == InputButtons.bull {
            return true
        }
        return false
    }
}

#Preview {
    let classicGame = createDummyClassicGame(players: 3)
    let button = InputButtons.zero
    
    ButtonsView(gameProgress: .constant(GameViewStates.gameInProgress), button: button, refresh: .constant(false), isDouble: .constant(false), isTriple: .constant(false)).environmentObject(classicGame)
}

