pragma solidity ^0.5.0;

contract Election {
    struct Candidate {
        uint id;
        string name;
        uint voteCount;
    }
    struct Vote{
        address voterAddress;
        uint choice;
    }
    struct Voter{
        string voterName;
        bool voted;
    }
    enum State { Created, Voting, Ended }

    mapping(uint => Candidate) public candidates;
    mapping(uint => Vote) private votes;
    mapping(address => Voter) public voterRegister;
    uint public cadidatesCount = 0;
    uint public voterCount = 0;
    uint public voteCount = 0;
    address public electionOfficialAddress;      
    string public electionOfficialName;
    string public electionDescription;
	State public electionState;

    //constructor
    constructor (string memory name, string memory description) public {
        electionOfficialAddress = msg.sender;
        electionOfficialName = name;
        electionDescription = description;
        electionState = State.Created;
    }

    modifier inOfficial() {
		require(msg.sender == electionOfficialAddress);
		_;
	}
	modifier inState(State st) {
		require(state == st);
		_;
	}

    event voterAdded(address voter);
    event voteStarted();
    event voteEnded(mapping(uint => Candidate) finalResult);
    event voteDone(address voter);

    function addVoter(address voterAddress, string memory voterName)
        public
        inState(State.Created)
        inOfficial
    {
        Voter memory voter;
        voter.voterName = voterName;
        voter.voted = false;
        voterRegister[voterAddress] = voter;
        voterCount++;
        emit voterAdded(voterAddress);
    }

    function startVote()
        public
        inState(State.Created)
        inOfficial
    {
        electionState = State.Voting;     
        emit voteStarted();
    }

    function doVote(uint choice)
        public
        inState(State.Voting)
        returns (bool voted)
    {
        bool ok = false;
        
        if (bytes(voterRegister[msg.sender].voterName).length != 0 
        && !voterRegister[msg.sender].voted){
            voterRegister[msg.sender].voted = true;
            Vote memory vote;
            vote.voterAddress = msg.sender;
            vote.choice = choice;
            if (choice){
                candidates[choice].voteCount++;
                //countResult++; //counting on the go
            }
            votes[totalVote] = vpte;
            totalVote++;
            ok = true;
        }
        emit voteDone(msg.sender);
        return ok;
    }

    function endVote()
        public
        inState(State.Voting)
        inOfficial
    {
        electionState = State.Ended;
        //finalResult = countResult; //move result from private countResult to public finalResult
        emit voteEnded(candidates);
    }
}