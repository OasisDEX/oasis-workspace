import { Network } from '@deploy-configurations/types/network'
import { getForkedNetwork as getUnderlyingNetwork } from '@deploy-configurations/utils/network'
import { DeploymentSystem } from '@dma-contracts/scripts/deployment/deploy'
import { task } from 'hardhat/config'

task('deploy-ajna', 'Deploy the system to a local node.').setAction(
  async (taskArgs: { configExtensionPath: string }, hre) => {
    const ds = new DeploymentSystem(hre)
    await ds.init()
    const network = await getUnderlyingNetwork(hre.ethers.provider)

    /**
     * We're using test-config files for now because they
     * redeploy the service registry allowing for a full system deployment
     */
    const configByNetwork = {
      [Network.MAINNET]: './test/mainnet.conf.ts',
      [Network.OPTIMISM]: './test/optimism.conf.ts',
    }
    if (network === Network.GOERLI) throw new Error('Goerli is not supported yet')
    const configPath = configByNetwork[network]
    await ds.loadConfig(configPath)

    const swapConfigPath = './test/swap.conf.ts'
    await ds.extendConfig(swapConfigPath)

    await ds.deployAll()
    await ds.addAllEntries()

    const dsSystem = ds.getSystem()
    const { system } = dsSystem
    const swapContract = system.uSwap ? system.uSwap.contract : system.Swap.contract

    await swapContract.addFeeTier(0)
    await swapContract.addFeeTier(7)
    await system.AccountGuard.contract.setWhitelist(system.OperationExecutor.contract.address, true)
  },
)
