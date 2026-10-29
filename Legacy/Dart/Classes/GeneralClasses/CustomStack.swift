//
//  CustomStack.swift
//  Dart
//
//  Created by Luca Blechschmidt on 18.03.25.
//

import Foundation

struct CustomStack<T> {
    private var elements: [T]
    
    init() {
        self.elements = []
    }
    
    mutating func push(_ item: T) {
        elements.append(item)
    }
        
    // Pop the last element (Last-Out)
    mutating func pop() -> T? {
        return elements.popLast()
    }
    
    // Peek at the top element without removing it
    func peek() -> T? {
        return elements.last
    }
    
    // Check if the stack is empty
    var isEmpty: Bool {
        return elements.isEmpty
    }
    
    // Get the size of the stack
    var size: Int {
        return elements.count
    }
    
    // Clear all elements
    mutating func clear() {
        elements.removeAll()
    }
}
