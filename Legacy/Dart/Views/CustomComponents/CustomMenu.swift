//
//  CustomMenu.swift
//  Dart
//
//  Created by Luca Blechschmidt on 25.01.25.
//

import SwiftUI

struct CustomMenu<T: Hashable>: View {
    let title: String
    let isDisabled: Bool
    let hasCustomItems: Bool
    let formatter: Formatter?
    let labels: [T]
    @State var isEditing: Bool = false
    
    @Binding var selectedItem: T
    
    var body: some View {
        VStack {
            Button(action: {
                isEditing.toggle()
            }) {
                let text: String = title.isEmpty ? "" : "\(title): "
                Text(text + "\(selectedItem)")
                    .font(.system(size: 25))
            }.disabled(isDisabled)
            .padding(15.0)
                .foregroundColor(Color("TextColor"))
                .background(Color.gray)
                .cornerRadius(10)
            if isEditing {
                VStack {
                    ForEach(labels, id: \.self) { label in
                        Text("\(label)")
                            .font(.system(size: 20))
                            .onTapGesture {
                            isEditing.toggle()
                            selectedItem = label
                        }
                        .padding(10.0)
                        .foregroundColor(Color("TextColor"))
                            .background(Color.gray)
                            .cornerRadius(10)
                    }
                    if hasCustomItems {
                        TextField("Custom", value: $selectedItem, formatter: formatter!)
                            .font(.system(size: 20))
                            .frame(maxWidth: 50)
                            .padding(10.0)
                            .foregroundColor(Color("TextColor"))
                                .background(Color.gray)
                                .cornerRadius(10)
                            .textFieldStyle(.roundedBorder)
                    }
                }
            }
        }
    }
}

#Preview {
    let labels: [AnyHashable] = [501, 401, 301]
    let selectedItem: AnyHashable = 501 as AnyHashable
    
    CustomMenu(title: "points", isDisabled: false, hasCustomItems: true, formatter: NumberFormatter(), labels: labels, selectedItem: .constant(selectedItem))
}
