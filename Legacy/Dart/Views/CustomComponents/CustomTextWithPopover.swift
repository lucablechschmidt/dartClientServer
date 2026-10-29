//
//  CustomTextWithPopover.swift
//  Dart
//
//  Created by Luca Blechschmidt on 09.02.25.
//

import SwiftUI

struct CustomTextWithPopover<T: Hashable>: View {
    let label: String
    let values: [T]
    @Binding var selectedValue: T?
    
    @State var isShowingPopover: Bool = false
    
    var body: some View {
        VStack {
            ZStack {
                //Color(.systemBackground)
                if false {
                    VStack {
                        ForEach(values, id: \.self) { value in
                            Button(action: {
                                selectedValue = value
                                isShowingPopover = false
                            }) {
                                Text("\(value)")
                            }
                        }
                    }
                    
                } else {
                    Text(label).onTapGesture {
                        isShowingPopover.toggle()
                    }
                }
                
            }.sheet(isPresented: $isShowingPopover) {
                Text("Hello").onTapGesture {
                    isShowingPopover.toggle()
                }
                 //.presentationDetents([.height(325)])
                 //.presentationDragIndicator(.hidden)
              }
        }.frame(width: UIScreen.main.bounds.width)
            .onTapGesture {
                isShowingPopover = false
                print("TEXT")
            }
        
    }
}

#Preview {
    let values = [1, 2, 3, 4, 5, 6]
    Text("PlaceHolder")
    CustomTextWithPopover(label: "Legs", values: values, selectedValue: .constant(1))
    Text("PlaceHolder")
}
