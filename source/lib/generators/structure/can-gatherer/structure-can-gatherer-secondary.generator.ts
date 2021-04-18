import { ConfigModel, StructureModel, StructureNetwork } from '@lib/types';
import { StructureCanGathererGenerator } from './structureCanGathererGenerator';

/**
 * The StructureCanGathererSecondaryGenerator class, extending the [[StructureCanGathererGenerator]] class and generating the code that gathers the messages data from the secondary canbus network.
 */
class StructureCanGathererSecondaryGenerator extends StructureCanGathererGenerator {
    /**
     * The template comment that this generator handles.
     */
    protected comment = '{{GENERATE_STRUCTURE_CAN_GATHERER_SECONDARY}}';

    /** The canbus network that the messages belong to */
    protected network: StructureNetwork = 'Secondary';

    /**
     * The constructor of the [[StructureCanGathererSecondaryGenerator]] class.
     * @param structure The structure model: the generated code will depend on it.
     * @param config The config model: the generated code will not actually depend on it.
     */
    constructor(structure: StructureModel, config: ConfigModel) {
        super(structure, config);
        this.generate();
    }
}

export { StructureCanGathererSecondaryGenerator as generator };
