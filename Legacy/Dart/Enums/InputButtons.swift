//
//  InputButtons.swift
//  Dart
//
//  Created by Luca Blechschmidt on 25.01.25.
//

import Foundation

enum InputButtons: String {
    
    case zero, one, two, three, four, five, six
    case seven, eight, nine, ten, eleven, twelve, thirteen
    case fourteen, fifteen, sixteen, seventeen, eighteen, nineteen, twenty, bull
    case ok

    case double, triple, undo
    
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
            case .double: return "Double"
            case .triple: return "Triple"
            case .undo: return "Undo"
            case .ok: return "OK"
        }
    }
    
    var value: Int{
        switch self{
            case .zero:         return 0
            case .one:          return 1
            case .two:          return 2
            case .three:        return 3
            case .four:         return 4
            case .five:         return 5
            case .six:          return 6
            case .seven:        return 7
            case .eight:        return 8
            case .nine:         return 9
            case .ten:          return 10
            case .eleven:       return 11
            case .twelve:       return 12
            case .thirteen:     return 13
            case .fourteen:     return 14
            case .fifteen:      return 15
            case .sixteen:      return 16
            case .seventeen:    return 17
            case .eighteen:     return 18
            case .nineteen:     return 19
            case .twenty:       return 20
            case .bull:         return 25
            default:            return -1
        }
    }
}
