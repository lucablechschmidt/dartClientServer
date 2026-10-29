//
//  SingleDartsScore.swift
//  Dart
//
//  Created by Luca Blechschmidt on 25.01.25.
//

import Foundation

enum DartFields: CaseIterable, Hashable {
    case zero, one, two, three, four, five, six
    case seven, eight, nine, ten, eleven, twelve, thirteen
    case fourteen, fifteen, sixteen, seventeen, eighteen, nineteen, twenty, bull
    
    var title: String{
        switch self{
            case .zero: return "0"
            case .one: return "1"
            case .two: return "2"
            case .three: return "3"
            case .four: return "4"
            case .five: return "5"
            case .six: return "6"
            case .seven: return "7"
            case .eight: return "8"
            case .nine: return "9"
            case .ten: return "10"
            case .eleven: return "11"
            case .twelve: return "12"
            case .thirteen: return "13"
            case .fourteen: return "14"
            case .fifteen: return "15"
            case .sixteen: return "16"
            case .seventeen: return "17"
            case .eighteen: return "18"
            case .nineteen: return "19"
            case .twenty: return "20"
            case .bull: return "Bull"
        }
    }
}

class SingleDartsScore: Hashable {
    let fieldName: DartFields
    let field: Int
    let scoreType: ScoreType
    let totalScoreOfDart: Int
    
    init(field: Int, scoreType: ScoreType) {
        self.field = field
        self.fieldName = fieldNumberToDartField(field)
        self.scoreType = scoreType
        
        switch scoreType {
            case .normal: self.totalScoreOfDart = 1 * field
            case .double: self.totalScoreOfDart = 2 * field
            case .triple: self.totalScoreOfDart = 3 * field
            default: self.totalScoreOfDart = 0
        }
        func fieldNumberToDartField(_ field: Int) -> DartFields {
            switch field {
                case 1: return .one
                case 2: return .two
                case 3: return .three
                case 4: return .four
                case 5: return .five
                case 6: return .six
                case 7: return .seven
                case 8: return .eight
                case 9: return .nine
                case 10: return .ten
                case 11: return .eleven
                case 12: return .twelve
                case 13: return .thirteen
                case 14: return .fourteen
                case 15: return .fifteen
                case 16: return .sixteen
                case 17: return .seventeen
                case 18: return .eighteen
                case 19: return .nineteen
                case 20: return .twenty
                case 25: return .bull
                default: return .zero
            }
        }
    }
    
    func getMultiplier() -> Int {
        switch scoreType {
            case .normal: return 1
            case .double: return 2
            case .triple: return 3
            default: return 0
        }
    }
    
    static func == (lhs: SingleDartsScore, rhs: SingleDartsScore) -> Bool {
            ObjectIdentifier(lhs) == ObjectIdentifier(rhs)
    }

    func hash(into hasher: inout Hasher) {
        hasher.combine(ObjectIdentifier(self))
    }
    
    func toString() -> String {
        switch scoreType {
            case .double: return "D\(fieldName.title)"
            case .triple: return "T\(fieldName.title)"
            case .normal: return "S\(fieldName.title)"
            case .overthrown: return "-"
            default: return ""
        }
    }
}

func createDummySingleDartScore() -> SingleDartsScore {
    return SingleDartsScore(field: 0, scoreType: .unset)
}

class SingleDartScoreForView: Hashable {
    var isCurrentThrow: Bool
    let singleDartThrowScore: SingleDartsScore
    
    init(isCurrentThrow: Bool, singleDartThrowScore: SingleDartsScore) {
        self.isCurrentThrow = isCurrentThrow
        self.singleDartThrowScore = singleDartThrowScore
    }
    
    static func == (lhs: SingleDartScoreForView, rhs: SingleDartScoreForView) -> Bool {
            ObjectIdentifier(lhs) == ObjectIdentifier(rhs)
    }

    func hash(into hasher: inout Hasher) {
        hasher.combine(ObjectIdentifier(self))
    }
}

func createDummySingleDartsScoreforView(_ isCurrentThrow: Bool) -> SingleDartScoreForView {
    return SingleDartScoreForView(isCurrentThrow: isCurrentThrow, singleDartThrowScore: createDummySingleDartScore())
}

func createDummySingleDartsScoreforView(_ isCurrentThrow: Bool, _ field: Int, _ scoreType: ScoreType) -> SingleDartScoreForView {
    return SingleDartScoreForView(isCurrentThrow: isCurrentThrow, singleDartThrowScore: SingleDartsScore(field: field, scoreType: scoreType))
}

func createDummySingleDartsScoresForView() -> [SingleDartScoreForView] {
    var singleDartScores: [SingleDartScoreForView] = []
    singleDartScores.append(createDummySingleDartsScoreforView(false, 20, .double))
    singleDartScores.append(createDummySingleDartsScoreforView(true))
    singleDartScores.append(createDummySingleDartsScoreforView(false))
    
    return singleDartScores
}
