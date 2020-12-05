#include <MultiMap.h>

int encoderAvgSum = 0;
int sliderAvgSum = 0;
int avgIndex = 0;

void setup() {
  Serial.begin(9600);
  pinMode(2, INPUT_PULLUP); // 4
  pinMode(3, INPUT_PULLUP); // 5
  pinMode(4, INPUT_PULLUP); // 6
  pinMode(5, INPUT_PULLUP); // 1
  pinMode(6, INPUT_PULLUP); // 2
  pinMode(7, INPUT_PULLUP); // 3
  pinMode(8, INPUT_PULLUP); // 0
}

void loop() {  
  int out[] = {0, 25, 50, 75, 100};
  int in[] = {0, 13, 170, 450, 1020};
  int encoderValue = analogRead(A0)-512;
  int sliderValue = multiMap(analogRead(A1), in, out, 5);
  
  encoderAvgSum += encoderValue;
  sliderAvgSum += sliderValue;
  avgIndex++;

  if (avgIndex == 3) {
    int encoderAvg = encoderAvgSum/avgIndex;
    int sliderAvg = sliderAvgSum/avgIndex;
    int button = !digitalRead(A2);

    Serial.print(!digitalRead(8));
    Serial.print(",");
    Serial.print(!digitalRead(7));
    Serial.print(",");
    Serial.print(!digitalRead(6));
    Serial.print(",");
    Serial.print(!digitalRead(5));
    Serial.print(",");
    Serial.print(!digitalRead(4));
    Serial.print(",");
    Serial.print(!digitalRead(3));
    Serial.print(",");
    Serial.print(!digitalRead(2));
    Serial.print(",");
    Serial.print(encoderAvg);
    Serial.print(",");
    Serial.println(sliderValue);
    avgIndex = 0;
    encoderAvgSum = 0;
    sliderAvgSum = 0;
  }
  
  delay(2);
}
