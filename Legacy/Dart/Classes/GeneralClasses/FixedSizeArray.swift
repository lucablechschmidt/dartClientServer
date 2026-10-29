//
//  FixedSizeArray.swift
//  Dart
//
//  Created by Luca Blechschmidt on 25.01.25.
//

import Foundation

struct FixedSizeArray<T> {
    
    private var maxSize: Int
    private var defaultValue: T
    private var array: [T]
    private(set) var count = 0

    init(maxSize: Int, defaultValue: T) {
        self.maxSize = maxSize
        self.defaultValue = defaultValue
        self.array = [T](repeating: defaultValue, count: maxSize)
    }

    subscript(index: Int) -> T {
        assert(index >= 0)
        assert(index <= count)
        return array[index]
    }

    mutating func append(_ newElement: T) {
        assert(count < maxSize)
        array[count] = newElement
        count += 1
    }
    
    mutating func updateCurrentElement(_ newElement: T) {
        assert(count > 0)
        array[count] = newElement
    }
    
    mutating func removeLast() -> T {
        assert(count > 0)
        count -= 1
        let value = array[count]
        array[count] = defaultValue
        
        return value
    }

    mutating func removeAt(index: Int) -> T {
        assert(index >= 0)
        assert(index < count)
        count -= 1
        let result = array[index]
        array[index] = array[count]
        array[count] = defaultValue
        return result
    }

    mutating func removeAll() {
        for i in 0..<count {
            array[i] = defaultValue
        }
        count = 0
    }
    
    func returnLastElement() -> T? {
        assert(count > 0)
        return array[count - 1]
    }
    
    func getMaxSize() -> Int {
        return maxSize
    }
    
    func isEmpty() -> Bool {
        return count == 0
    }
}
