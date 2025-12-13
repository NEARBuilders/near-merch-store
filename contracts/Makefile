.PHONY: all build build-nft build-marketplace clean

all: build

build: build-nft build-marketplace

build-nft:
	cd nft && cargo near build non-reproducible-wasm

build-marketplace:
	cd marketplace && cargo near build non-reproducible-wasm

clean:
	cd nft && cargo clean
	cd marketplace && cargo clean
