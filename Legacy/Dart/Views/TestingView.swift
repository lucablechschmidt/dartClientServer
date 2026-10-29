//
//  TestingView.swift
//  Dart
//
//  Created by Luca Blechschmidt on 11.02.25.
//

import SwiftUI

struct TestingView: View {
    @State private var showPopover = true
    
    var body: some View {
        ZStack {
            Text("🎯")
            Text("🎯")
            Text("🎯")
        }
        /*ZStack {
            Button("Show Popover") {
                  showPopover.toggle()
                }
            if showPopover {
                Text("Hallo123567").frame(width: 200, height: 200)
            }
            
        }
        Text("Hallo")
        Button("Show Popover") {
              showPopover.toggle()
            }
            .buttonStyle(.borderedProminent)
            //.popover(isPresented: $showPopover) {
            //  Text("This is a Popover").onTapGesture {
            //      showPopover.toggle()
            //  }
            //    .padding()
            //    .frame(minWidth: 300, maxHeight: 400)
            //    .presentationCompactAdaptation(.popover)
            //    .background(.clear)
            //}.background(.clear)*/
    }
}

#Preview {
    TestingView()
    /*
    VStack {
        Text("TEST")
        TestingView()
        Text("TEST")
    }.padding()
    .background(.gray)*/
}
