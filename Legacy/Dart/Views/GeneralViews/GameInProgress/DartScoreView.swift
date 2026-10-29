//
//  DartScoreView.swift
//  Dart
//
//  Created by Luca Blechschmidt on 25.01.25.
//

import SwiftUI

struct DartScoreView: View {
    
    @Binding var refresh: Bool
    
    let dartThrow: [SingleDartScoreForView]
    
    let faultyDartThrow: Bool
    
    var body: some View {
        HStack {
            ForEach( dartThrow , id: \.self){ dart in
                    VStack{
                        if(dart.singleDartThrowScore.scoreType == ScoreType.unset) {
                            Text("")
                                .font(.body)
                                .shadow(color: Color.blue, radius: 1, x: 0, y: 0)
                        } else if (dart.singleDartThrowScore.scoreType == ScoreType.overthrown) {
                            Text("Dart")
                                .font(.body)
                            Text(dart.singleDartThrowScore.toString())
                                .font(.subheadline)
                                .foregroundStyle(.red)
                        }
                        else {
                            Text("Dart").font(.body).foregroundColor(Color.black)
                            Text(dart.singleDartThrowScore.toString())
                                .font(.subheadline)
                                .foregroundColor(Color.black)
                        }
                    }.frame(width: UIScreen.main.bounds.width / 6, height:  UIScreen.main.bounds.height / 15)
                    .overlay(borderDartScore(dart: dart))
            }.background(Color("FrameBackground")).cornerRadius(18)
        }
    }
    
    func borderDartScore(dart: SingleDartScoreForView) -> some View {
        return dart.isCurrentThrow ? RoundedRectangle(cornerRadius: 18)
            .stroke(Color.blue, lineWidth: 4) : RoundedRectangle(cornerRadius: 18)
            .stroke(Color.black, lineWidth: 3)
    }
}

#Preview {
    let singleDartScores = createDummySingleDartsScoresForView()
    DartScoreView(refresh: .constant(true), dartThrow: singleDartScores, faultyDartThrow: false)
}
