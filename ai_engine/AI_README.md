# Hashplay AI: Mining Engine Architecture

This document outlines the technical implementation of the **Hashplay AI Mining Engine**, the predictive economic core of the Hashplay ecosystem.

## 🤖 AI Philosophy: The "Economic Brain"
In decentralized environments, putting broad machine learning (ML) inference directly into smart contracts is often gas-prohibitive and technically inflexible. Hashplay AI solves this by utilizing a **Hybrid AI Architecture**.

- **On-Chain (Hedera EVM)**: Execution and Immutable Accounting.
- **Off-Chain (AI Engine)**: Predictive Modeling and Macro-Economic Strategy.

## 🛠️ The Technical Flow
The "Mining Engine" operates as an **Autonomous Economic Oracle** that prevents point-inflation and ensures long-term sustainability for the "Win or Mine" platform.

1. **Ingestion**: The engine monitors the Hedera Mainnet via Mirror Node APIs, ingesting real-time wager velocity, gas consumption metrics, and user retention data.
2. **Inference**: Using a `LinearRegression` model (Scikit-Learn), the engine forecasts future network "heat" and wager frequency.
3. **Synthesis**: The model calculates the optimal **Mining Multiplier**—the rate at which losing players are awarded XP.
4. **Equilibrium**: If high velocity is detected (indicating possible farming or hyper-inflation), the AI recommends a deflationary adjustment to the contract's emission variables.

## 📈 Model Specification
The current production-ready prototype (`economic_oracle.py`) utilizes a **Supervised Learning** approach:
- **Features**: Wager Timestamps, Historical Gas Load, Transaction Volume per Block.
- **Target Variable**: Economic Multiplier (Range: 1.0x to 2.5x).
- **Goal**: To maintain a target "XP Emission Velocity" that matches the platform's TVL (Total Value Locked) and user growth curve.

## 🚀 Roadmap: Neural Network Integration
While the current version uses Linear Regression for speed and explainability, the V2 roadmap includes:
- **Recurrent Neural Networks (RNN)**: For more complex time-series forecasting of user behavior.
- **Reinforcement Learning (RL)**: Implementing an agent that dynamically optimizes the "House Edge" vs. "XP Rewards" to maximize community engagement without compromising the treasury.

---
*Hashplay AI – Redefining Decentralized Engagement through Predictive Intelligence.*
