# Accepted-Contract Fixture Execution Results V1.2

Executed: `2026-08-13` (`Asia/Shanghai`)

Scope: local, zero credential, zero Provider/API/model call. The executable evidence source is [ACCEPTED_CONTRACT_FIXTURE_REPRODUCTION_V1_2.mts](./ACCEPTED_CONTRACT_FIXTURE_REPRODUCTION_V1_2.mts).

## Runtime

```text
Node 24.14.0
V8 13.6.233.17-node.41
ICU 78.2
Unicode 17.0
CLDR 48.0
darwin/arm64
```

Dependencies were made available through a temporary symlink-only local `node_modules` view and removed immediately after execution. The worktree contained no dependency or lockfile mutation afterward.

## Attempt 1 finding reproduction

The same executable imported the immutable V1.1 fixture, then sent it through the accepted contracts:

```text
accepted request binder/context disposition = context_prohibited_data
accepted product output policy disposition = output_policy_rejected
```

This independently reproduces the original M-01 root before evaluating V1.2.

## V1.2 accepted-contract result

```text
fixture ID prefix check                PASS
Synthetic prefix checks                PASS
actor role = product_editor            PASS
target status = draft                  PASS
maxAttempts = 1                        PASS
protected-data classifier              allow
accepted request binder                accepted
binder/independent fingerprint equality PASS
product_description_draft output policy accepted
protected disposition                  draft_human_review
run ceiling >= conservative upper cost PASS
```

Exact derived values:

| Fact | Result |
|---|---|
| fixture JCS hash / bytes | `6ee8e7504844d0a63aca49590c0d790e22cf911bea58b2d377bf23cf30bbe24a` / `3,299` |
| Prompt hash / bytes | `1edce2035e15e32a4e4fd4bca04f4a9f6d4c3796c86b63cdb9a28e4810f4c522` / `1,259` |
| target snapshot | `36dd336154ebf19626d2b1921506544bb6e8727ddfc916094838eb9321111e3f` |
| input hash / bytes | `f6da8cb61c760f6ddb92da64a0495beff690287417d83271b3954e41c5cffeb8` / `785` |
| explicit-input hash / bytes | `a5d32996087908d35645955d54a7bb419e247fd9e2f275f6527ca1a962f163c9` / `182` |
| accepted request fingerprint | `023fa10bb4fa8451cd2b8306e9f6f2794f90190ac5af231d0e6e9626cd026813` |
| expected / protected output hashes | `0c02a4bd2e5965a396b7eda1e816eacf989d074d48334e947f9ec5b4e2c812fc` / `3efbc524f3df75c73e97ef9e414a47fb531d544bc650c66b4df38fdc7e63506f` |
| resolved config | `9b312bfeadaf10af5daeb1e67ccc5deef267dff42da720a10cd863332b73a49d` |
| envelope | `28bdd2cedf963e65a817103fc41b5c0e636fff110938c590e6d80aedb6d68a0e` |
| rendered instruction / bytes | `4aeaa1ba6f799a32f821fb007caecf8625dfbd1503b2f7123c31d6e9288a789e` / `914` |
| Provider-neutral input / adapter estimate | `0` / `1,426` bytes |
| Provider-request identity | `afba78fff0b7aff8660bfe0b6db0b15ae7cdb3b5edb628cb7722226d4d78b3ef` |
| one-attempt upper cost | `305` microusd |

The request-authorization stub returns the real accepted association snapshot and changes no classifier/context/binder/output code. Only explicit input is selected; any non-explicit source read throws. The reproduction uses no test-only bypass and produces no enqueue/database/network side effect. Durable enqueue/Worker/fence/settlement remain future implementation proof obligations, not claimed executed here.
