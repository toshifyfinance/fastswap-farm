const {expectRevert, time} = require('@openzeppelin/test-helpers');
const {assert} = require('chai');
const MasterChef = artifacts.require('MasterChef');
const MockERC20 = artifacts.require('MockERC20');

contract('MasterChef', ([alice, bob, carol, minter, migrator]) => {
    beforeEach(async () => {
        this.fast = await MockERC20.new('Fast', 'Fast', web3.utils.toWei('1000000000', 'ether'), {from: minter});
    });

    it('should set correct state variables', async () => {
        const timestamp = await time.latest();
        const endTimestamp = timestamp.add(time.duration.days(3));
        this.chef = await MasterChef.new(this.fast.address, endTimestamp, timestamp, {from: alice});

        const fast = await this.chef.fast();
        assert.equal(fast.valueOf(), this.fast.address);
    });

    it('should correct change variables', async () => {
        const timestamp = await time.latest();
        const endTimestamp = timestamp.add(time.duration.days(3));
        this.chef = await MasterChef.new(this.fast.address, endTimestamp, timestamp, {from: alice});

        await this.chef.setMigrator(migrator)

        const newMigrator = await this.chef.migrator();
        assert.equal(newMigrator.valueOf(), migrator);
    });

    context('With ERC/LP token added to the field', () => {
        beforeEach(async () => {
            this.lp = await MockERC20.new('LPToken', 'LP', web3.utils.toWei('10000000000', 'ether'), {from: minter});
            await this.lp.transfer(alice, web3.utils.toWei('1000', 'ether'), {from: minter});
            await this.lp.transfer(bob, web3.utils.toWei('1000', 'ether'), {from: minter});
            await this.lp.transfer(carol, web3.utils.toWei('1000', 'ether'), {from: minter});

            this.lp2 = await MockERC20.new('LPToken2', 'LP2', web3.utils.toWei('10000000000', 'ether'), {from: minter});
            await this.lp2.transfer(alice, web3.utils.toWei('1000', 'ether'), {from: minter});
            await this.lp2.transfer(bob, web3.utils.toWei('1000', 'ether'), {from: minter});
            await this.lp2.transfer(carol, web3.utils.toWei('1000', 'ether'), {from: minter});
        });

        it('should return correct poolLength', async () => {
            const timestamp = await time.latest();
            const endTimestamp = timestamp.add(time.duration.days(90));
            this.chef = await MasterChef.new(this.fast.address, endTimestamp, timestamp, {from: alice});
            this.fast.transfer(this.chef.address, web3.utils.toWei('1000000000', 'ether'), {from: minter});

            await expectRevert(this.chef.add(0, this.lp.address, true), 'add: incorrect value');
            await this.chef.add(20, this.lp.address, true);
            assert.equal(await this.chef.poolLength(), 1);

            await this.chef.add(20, this.lp2.address, false);
            assert.equal(await this.chef.poolLength(), 2);
        });

        it('should allow emergency withdraw', async () => {
            const timestamp = await time.latest();
            const endTimestamp = timestamp.add(time.duration.days(90));
            this.chef = await MasterChef.new(this.fast.address, endTimestamp, timestamp, {from: alice});
            this.fast.transfer(this.chef.address, web3.utils.toWei('1000000000', 'ether'), {from: minter});

            await this.chef.add(20, this.lp.address, true);

            await this.lp.approve(this.chef.address, web3.utils.toWei('1000', 'ether'), {from: bob});
            await this.chef.deposit(0, web3.utils.toWei('100', 'ether'), {from: bob});
            assert.equal(await this.lp.balanceOf(bob), web3.utils.toWei('900', 'ether'));

            await this.chef.emergencyWithdraw(0, {from: bob});
            assert.equal(await this.lp.balanceOf(bob), web3.utils.toWei('1000', 'ether'));
        });

        it('should return correct values pendingFast for 1 user', async () => {
            const timestamp = await time.latest();
            const endTimestamp = timestamp.add(time.duration.days(3));
            this.chef = await MasterChef.new(this.fast.address, endTimestamp, timestamp, {from: alice});
            // To last for 3 days
            this.fast.transfer(this.chef.address, web3.utils.toWei('200000', 'ether'), {from: minter});

            await this.chef.add(20000, this.lp.address, false);
            await this.lp.approve(this.chef.address, web3.utils.toWei('200001', 'ether'), {from: bob});
            await this.chef.deposit(0, web3.utils.toWei('100', 'ether'), {from: bob});
            assert.equal(await this.chef.pendingFast(0, bob), 0);

            await time.increase(time.duration.days(1));
            let pendingFast = await this.chef.pendingFast(0, bob);
            console.log("110, pendingFast: ", pendingFast.toString())
            // assert(pendingFast > web3.utils.toWei('89041', 'ether'));
            // assert(pendingFast < web3.utils.toWei('89043', 'ether'));

            await time.increase(time.duration.days(1));
            pendingFast = await this.chef.pendingFast(0, bob);
            // assert(pendingFast > web3.utils.toWei('178082', 'ether'));
            // assert(pendingFast < web3.utils.toWei('178084', 'ether'));

            await time.increase(time.duration.days(1));
            pendingFast = await this.chef.pendingFast(0, bob);
            // assert(pendingFast > web3.utils.toWei('267121', 'ether'));
            // assert(pendingFast < web3.utils.toWei('267124', 'ether'));

            await time.increase(time.duration.days(1));
            pendingFast = await this.chef.pendingFast(0, bob);
            // assert(pendingFast > web3.utils.toWei('267122', 'ether'));
            // assert(pendingFast < web3.utils.toWei('267124', 'ether'));
        });

    });
});
