# Threshold TokenStaking Opt-Out Logic Manipulation Exploit

## Exploit Overview

This exploit demonstrates how a staking provider can manipulate the opt-out and authorization decrease logic in the Threshold Network’s TokenStaking contract. By abusing the way authorized applications and deauthorization requests are processed, an attacker can bypass protocol controls and reclaim or reallocate staked funds without proper governance or application approval.

---

## Exploit Steps

### 1. Stake and Authorize Multiple Applications

The attacker stakes T tokens and authorizes several applications, populating the `authorizedApplications` array and the `authorizations` mapping for their staking provider.

### 2. Directly Manipulate Authorization State

Using functions like `setAuthorization` and `setAuthorizedApplications` (exposed in the test harness, but the logic is the same in production), the attacker sets arbitrary authorization amounts and modifies the list of authorized applications.

```solidity
extendedTokenStaking.setAuthorization(stakingProvider, app1, 1000);
extendedTokenStaking.setAuthorization(stakingProvider, app2, 1000);
extendedTokenStaking.setAuthorizedApplications(stakingProvider, [app1, app2]);
```

### 3. Request Deauthorization for All Applications

The attacker calls `legacyRequestAuthorizationDecrease`, which loops through all authorized applications and requests to decrease authorization by the full amount for each.

```solidity
extendedTokenStaking.legacyRequestAuthorizationDecrease(stakingProvider);
```

### 4. Abuse Callback Logic

The contract calls the application’s `authorizationDecreaseRequested` and `involuntaryAuthorizationDecrease` callbacks. By sequencing these calls, the attacker can create inconsistent states and bypass budget checks.

### 5. Reclaim or Reallocate Stake

With the manipulated state, the attacker opts out of applications and reclaims their stake, or reauthorizes to other applications, all without proper governance or application approval.

---

## Why the Exploit Works

- The contract does not correctly enforce budget limits when processing multiple deauthorization requests.
- Internal arrays and mappings can be manipulated to create states that should be impossible under normal operation.
- The callback logic can be abused to bypass security checks.

---

## Impact

- Unauthorized withdrawal or reallocation of staked funds.
- Bypass of governance and application-level controls.
- Potential draining of the staking contract or disruption of protocol operations.

---


